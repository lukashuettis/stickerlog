import { NATIONAL_TEAMS } from '@/data/teams'

/**
 * Tausch-Check payload codec.
 *
 * A payload is a tiny URL-fragment-safe string that captures one collector's
 * trade lists (seek + offer) or a concrete proposal. It's designed to:
 *
 *   - travel via WhatsApp/SMS/QR-code without backend involvement
 *   - never include personal data (names, notes, purchases)
 *   - decode in O(1) on any device with the same album catalog
 *   - extend forward (specials/variants) without breaking v1
 *
 * Binary layout (before base64url):
 *
 *   byte 0       version (uint8) — currently 1
 *   byte 1       kind    (uint8) — 0 = list, 1 = proposal
 *   bytes 2..124 seek-bitset (123 bytes covering 984 positions, of which 980 are
 *                used; trailing bits ignored on decode)
 *   bytes 125-126 offer-count (uint16 little-endian) — robust enough for >100
 *                duplicate slots without ever hitting the cap
 *   bytes 127+   offer entries — each is (positionIdx: uint16 LE, count: uint8)
 *                = 3 bytes per entry
 *
 * Position-Mapping (stable across builds within a major schema version):
 *   0..19   → FWC-0 .. FWC-19
 *   20..979 → NATIONAL_TEAMS[i] codes 1..20 in declaration order
 *
 * Size bounds:
 *   - typical (150 seek + 30 offer): ~217 raw → ~290 base64url chars
 *   - worst case (980 seek + 100 offer): 427 raw → ~570 chars
 *   - hard cap MAX_PAYLOAD_BYTES = 1400 → ~1870 chars
 */

export const PAYLOAD_VERSION = 1
export const KIND_LIST = 0 as const
export const KIND_PROPOSAL = 1 as const
export const TOTAL_SLOTS = 980
const BITSET_BYTES = Math.ceil(TOTAL_SLOTS / 8) // 123
export const MAX_PAYLOAD_BYTES = 1400

// ─── Position ↔ Sticker-ID maps (built once) ──────────────────────────────

const POSITION_TO_ID: string[] = (() => {
  const out: string[] = []
  for (let i = 0; i < 20; i++) out.push(`FWC-${i}`)
  for (const team of NATIONAL_TEAMS) {
    for (let n = 1; n <= 20; n++) out.push(`${team.code}-${n}`)
  }
  if (out.length !== TOTAL_SLOTS) {
    throw new Error(
      `Codec position table has ${out.length} entries, expected ${TOTAL_SLOTS}. ` +
        `Did the album structure change? Bump PAYLOAD_VERSION and add a migration.`,
    )
  }
  return out
})()

const ID_TO_POSITION: Map<string, number> = new Map(
  POSITION_TO_ID.map((id, i) => [id, i]),
)

// ─── Error types ──────────────────────────────────────────────────────────

export type CodecErrorCode =
  | 'unsupported_version'
  | 'unknown_kind'
  | 'invalid_base64'
  | 'truncated'
  | 'size_limit'
  | 'unknown_position'

export class CodecError extends Error {
  readonly code: CodecErrorCode
  constructor(message: string, code: CodecErrorCode) {
    super(message)
    this.name = 'CodecError'
    this.code = code
  }
}

// ─── Decoded shapes ───────────────────────────────────────────────────────

export type PayloadKind = typeof KIND_LIST | typeof KIND_PROPOSAL

export interface DecodedPayload {
  version: number
  kind: PayloadKind
  /** stickerIds the sender is looking for */
  seek: string[]
  /**
   * stickerIds the sender has surplus of, with the surplus count.
   * For proposals, this is "what the receiver gets" (proposer's outgoing).
   */
  offer: Array<{ id: string; dups: number }>
}

export interface EncodeInput {
  kind: PayloadKind
  seek: string[]
  offer: Array<{ id: string; dups: number }>
}

// ─── Base64URL helpers ────────────────────────────────────────────────────

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const b64 = btoa(binary)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(s: string): Uint8Array {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4 !== 0) b64 += '='
  let binary: string
  try {
    binary = atob(b64)
  } catch {
    throw new CodecError('Payload is not valid base64url', 'invalid_base64')
  }
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

// ─── Encode ────────────────────────────────────────────────────────────────

export function encodePayload(input: EncodeInput): string {
  if (input.kind !== KIND_LIST && input.kind !== KIND_PROPOSAL) {
    throw new CodecError(`Unknown kind: ${String(input.kind)}`, 'unknown_kind')
  }
  // Deduplicate to defend against bad callers.
  const seekIds = Array.from(new Set(input.seek))
  const offerMap = new Map<string, number>()
  for (const { id, dups } of input.offer) {
    if (dups < 1) continue
    offerMap.set(id, Math.max(offerMap.get(id) ?? 0, dups))
  }

  // Build bitset for seek
  const bitset = new Uint8Array(BITSET_BYTES)
  for (const id of seekIds) {
    const pos = ID_TO_POSITION.get(id)
    if (pos === undefined) {
      throw new CodecError(`Unknown sticker id: ${id}`, 'unknown_position')
    }
    bitset[pos >>> 3] |= 1 << (pos & 7)
  }

  // Offer entries (sparse)
  const offerEntries: Array<[number, number]> = []
  for (const [id, dups] of offerMap) {
    const pos = ID_TO_POSITION.get(id)
    if (pos === undefined) {
      throw new CodecError(`Unknown sticker id: ${id}`, 'unknown_position')
    }
    // Clamp dup count to uint8 (255) — anyone with 255 of one sticker is having a great year.
    offerEntries.push([pos, Math.min(255, dups)])
  }
  offerEntries.sort((a, b) => a[0] - b[0])

  const headerBytes = 1 /* version */ + 1 /* kind */ + BITSET_BYTES + 2 /* offer count */
  const totalBytes = headerBytes + offerEntries.length * 3
  if (totalBytes > MAX_PAYLOAD_BYTES) {
    throw new CodecError(
      `Payload size ${totalBytes} exceeds limit ${MAX_PAYLOAD_BYTES}`,
      'size_limit',
    )
  }

  const buf = new Uint8Array(totalBytes)
  buf[0] = PAYLOAD_VERSION
  buf[1] = input.kind
  buf.set(bitset, 2)
  const offerCountOffset = 2 + BITSET_BYTES
  buf[offerCountOffset] = offerEntries.length & 0xff
  buf[offerCountOffset + 1] = (offerEntries.length >>> 8) & 0xff
  let off = headerBytes
  for (const [pos, dups] of offerEntries) {
    buf[off] = pos & 0xff
    buf[off + 1] = (pos >>> 8) & 0xff
    buf[off + 2] = dups
    off += 3
  }

  return bytesToBase64Url(buf)
}

// ─── Decode ────────────────────────────────────────────────────────────────

export function decodePayload(b64: string): DecodedPayload {
  const bytes = base64UrlToBytes(b64)
  if (bytes.length > MAX_PAYLOAD_BYTES) {
    throw new CodecError(
      `Payload size ${bytes.length} exceeds limit ${MAX_PAYLOAD_BYTES}`,
      'size_limit',
    )
  }
  if (bytes.length < 2 + BITSET_BYTES + 2) {
    throw new CodecError('Payload too short', 'truncated')
  }
  const version = bytes[0]
  if (version !== PAYLOAD_VERSION) {
    throw new CodecError(
      `Unsupported payload version ${version}, expected ${PAYLOAD_VERSION}`,
      'unsupported_version',
    )
  }
  const kindRaw = bytes[1]
  if (kindRaw !== KIND_LIST && kindRaw !== KIND_PROPOSAL) {
    throw new CodecError(`Unknown kind: ${kindRaw}`, 'unknown_kind')
  }
  const kind = kindRaw as PayloadKind

  // Decode seek bitset
  const seek: string[] = []
  for (let pos = 0; pos < TOTAL_SLOTS; pos++) {
    const bit = (bytes[2 + (pos >>> 3)] >>> (pos & 7)) & 1
    if (bit) {
      const id = POSITION_TO_ID[pos]
      if (id) seek.push(id)
    }
  }

  // Decode offer entries
  const offerCountOffset = 2 + BITSET_BYTES
  const offerCount = bytes[offerCountOffset] | (bytes[offerCountOffset + 1] << 8)
  const expectedLen = offerCountOffset + 2 + offerCount * 3
  if (bytes.length < expectedLen) {
    throw new CodecError(
      `Payload truncated: expected ${expectedLen} bytes for ${offerCount} offer entries`,
      'truncated',
    )
  }
  const offer: Array<{ id: string; dups: number }> = []
  let off = offerCountOffset + 2
  for (let i = 0; i < offerCount; i++) {
    const pos = bytes[off] | (bytes[off + 1] << 8)
    const dups = bytes[off + 2]
    off += 3
    const id = POSITION_TO_ID[pos]
    if (!id) {
      // Unknown position from a future schema — skip gracefully so the
      // overall payload remains decodable, but report nothing crashy.
      continue
    }
    offer.push({ id, dups })
  }

  return { version, kind, seek, offer }
}

// ─── Convenience ──────────────────────────────────────────────────────────

/** True if the string looks like a payload (rough sniff, not validation). */
export function looksLikePayload(s: string): boolean {
  return /^[A-Za-z0-9_-]{20,2000}$/.test(s)
}
