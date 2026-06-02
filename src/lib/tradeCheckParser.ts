import { findStickerByCode } from '@/data/album'
import { decodePayload, looksLikePayload, CodecError } from './tradeCheckCodec'

/**
 * Free-text parser for the Tausch-Check fallback flow.
 *
 * Accepts anything a user might paste from WhatsApp or a chat:
 *   - A complete StickerLog URL (https://.../#/trade/check/<payload>)
 *   - StickerLog WhatsApp share text in DE or EN, with section headers
 *   - Free-form lists like "GER-3, FRA-5, BRA-7×2 i need GER-14"
 *   - Mixed noise: emojis, URLs, surrounding chatter
 *
 * Strategy:
 *   1. If the input contains a payload string from a StickerLog URL → decode
 *      that directly (most reliable signal).
 *   2. Otherwise, split into lines, classify each as seek/offer header or
 *      data, parse codes per section. Default (no headers detected) treats
 *      everything as `offer` — matches the common "look what I have"
 *      pasting pattern.
 */

export interface ParsedTradeText {
  /** sticker ids the OTHER person is looking for (from us) */
  seek: string[]
  /** sticker ids they have surplus of (offered to us), with counts */
  offer: Array<{ id: string; dups: number }>
  /** raw tokens we couldn't recognise — surface in UI so user can fix */
  invalid: string[]
  /** true if input contained an explicit "I seek" section header */
  hadSeekHeader: boolean
  /** true if input contained an explicit "I offer" section header */
  hadOfferHeader: boolean
  /** if we extracted a payload from a URL, the source URL is here */
  fromUrl?: string
}

const SEEK_HEADER_RE =
  /(ich\s+such|suche|sucht|wanted|i'?m\s+looking|looking\s+for|i\s+need|need\s+these|🔎|🔍|📥|wants?)/i
const OFFER_HEADER_RE =
  /(ich\s+biete|biete|biete\s+an|i\s+offer|i\s+have|got\s+to\s+trade|trades?|verfügbar|available|🤝|📤)/i
const URL_RE = /https?:\/\/\S+/gi
const PAYLOAD_FROM_URL_RE = /\/trade\/check\/([A-Za-z0-9_-]+)/

// Matches "GER-3", "ger 14", "FRA3" — same surface as parseStickerCodes,
// but here we also need to grab an optional × multiplier directly after.
const CODE_WITH_DUPS_RE =
  /([A-Z]{3})\s*-?\s*(\d{1,3})\s*(?:[x×X*]\s*(\d{1,3})|\((\d{1,3})\s*[x×X]\)|\((\d{1,3})\))?/gi

interface ParseSection {
  kind: 'seek' | 'offer'
  items: Array<{ id: string; dups: number }>
}

export function parseTradeText(input: string): ParsedTradeText {
  // ── 1. Try to extract a StickerLog payload URL first ──────────────────
  const urlMatch = input.match(/https?:\/\/\S+/i)
  if (urlMatch) {
    const m = urlMatch[0].match(PAYLOAD_FROM_URL_RE)
    if (m && m[1] && looksLikePayload(m[1])) {
      try {
        const decoded = decodePayload(m[1])
        return {
          seek: decoded.seek,
          offer: decoded.offer,
          invalid: [],
          hadSeekHeader: true,
          hadOfferHeader: true,
          fromUrl: urlMatch[0],
        }
      } catch (e) {
        // Not a valid payload — fall through to text parse, but note the
        // bad URL so the UI can mention it if everything else fails.
        if (!(e instanceof CodecError)) throw e
      }
    }
  }

  // ── 2. Strip URLs from the text we'll free-parse ──────────────────────
  const stripped = input.replace(URL_RE, ' ')

  // ── 3. Walk lines, accumulating into sections ─────────────────────────
  const lines = stripped.split(/\r?\n/)
  let currentSection: 'seek' | 'offer' | null = null
  const sections: ParseSection[] = []
  let hadSeekHeader = false
  let hadOfferHeader = false
  const allInvalid: string[] = []

  const ensureSection = (kind: 'seek' | 'offer'): ParseSection => {
    let s = sections.find((x) => x.kind === kind)
    if (!s) {
      s = { kind, items: [] }
      sections.push(s)
    }
    return s
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    // Header detection: if the line begins (or near-begins) with a seek or
    // offer keyword, set the section and ALSO parse any codes on the same
    // line (e.g. "I'm looking for: GER-3, FRA-5"). Length cap is just a
    // sanity bound against multi-sentence prose lines.
    const isShortLine = line.length <= 120
    const codeMatches = line.match(CODE_WITH_DUPS_RE) ?? []
    const isSeekHeader = isShortLine && SEEK_HEADER_RE.test(line)
    const isOfferHeader = isShortLine && OFFER_HEADER_RE.test(line)
    // If both keywords matched (rare — "I have stickers but I'm looking for…")
    // prefer the leftmost match.
    let effective: 'seek' | 'offer' | null = null
    if (isSeekHeader && isOfferHeader) {
      const seekMatch = line.match(SEEK_HEADER_RE)
      const offerMatch = line.match(OFFER_HEADER_RE)
      effective = (seekMatch?.index ?? 999) < (offerMatch?.index ?? 999) ? 'seek' : 'offer'
    } else if (isSeekHeader) effective = 'seek'
    else if (isOfferHeader) effective = 'offer'

    if (effective) {
      currentSection = effective
      if (effective === 'seek') hadSeekHeader = true
      else hadOfferHeader = true
      if (codeMatches.length > 0) {
        parseLineCodes(line, ensureSection(effective).items, allInvalid)
      }
      continue
    }

    // Data line — parse codes
    const target =
      currentSection ?? (sections.length === 0 ? 'offer' : currentSection ?? 'offer')
    const section = ensureSection(target)
    parseLineCodes(line, section.items, allInvalid)
  }

  // Coalesce + dedupe per section
  const seekIds = new Set<string>()
  const offerMap = new Map<string, number>()
  for (const section of sections) {
    if (section.kind === 'seek') {
      for (const item of section.items) seekIds.add(item.id)
    } else {
      for (const item of section.items) {
        offerMap.set(item.id, Math.max(offerMap.get(item.id) ?? 0, item.dups))
      }
    }
  }

  return {
    seek: Array.from(seekIds),
    offer: Array.from(offerMap, ([id, dups]) => ({ id, dups })),
    invalid: Array.from(new Set(allInvalid)),
    hadSeekHeader,
    hadOfferHeader,
  }
}

function parseLineCodes(
  line: string,
  out: Array<{ id: string; dups: number }>,
  invalid: string[],
): void {
  const seen: Array<[number, number]> = []
  const re = new RegExp(CODE_WITH_DUPS_RE.source, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    const code = `${m[1].toUpperCase()}-${m[2]}`
    const slot = findStickerByCode(code)
    if (slot) {
      const dupsRaw = m[3] ?? m[4] ?? m[5]
      const dups = dupsRaw ? Math.max(1, parseInt(dupsRaw, 10)) : 1
      out.push({ id: slot.id, dups })
      seen.push([m.index, m.index + m[0].length])
    } else {
      invalid.push(code)
      seen.push([m.index, m.index + m[0].length])
    }
  }

  // Look for unmatched alpha+digit tokens that don't match the pattern —
  // they're "invalid" so the user can see we ignored them.
  let cursor = 0
  for (const [start, end] of seen) {
    const gap = line.slice(cursor, start)
    for (const tok of gap.split(/[\s,;]+/)) {
      const t = tok.trim()
      if (t.length > 0 && /[A-Za-z][0-9]/.test(t) && !/^\d+$/.test(t)) {
        invalid.push(t.toUpperCase())
      }
    }
    cursor = end
  }
  // tail handled by the same logic for completeness
  const tail = line.slice(cursor)
  for (const tok of tail.split(/[\s,;]+/)) {
    const t = tok.trim()
    if (t.length > 0 && /[A-Za-z][0-9]/.test(t) && !/^\d+$/.test(t)) {
      invalid.push(t.toUpperCase())
    }
  }
}
