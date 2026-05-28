import type { AlbumSlot, Team } from './types'

export interface TradeListGroup {
  team: Team
  items: AlbumSlot[]
}

export interface SeekOfferLists {
  seek: TradeListGroup[]
  offer: Array<TradeListGroup & { dupCounts: Map<string, number> }>
  totalSeek: number
  totalOffer: number
}

export interface WhatsAppLabels {
  listTitle: string
  /** Function returning the "I'm seeking" header line with placeholder substituted. */
  seekHeader: (n: number) => string
  offerHeader: (n: number) => string
  empty: string
  footer: (url: string) => string
}

// ─── WhatsApp-friendly text ───────────────────────────────────────────────

export function generateWhatsAppText(
  lists: SeekOfferLists,
  labels: WhatsAppLabels,
  baseUrl: string = window.location.origin + window.location.pathname,
): string {
  const lines: string[] = []
  lines.push(labels.listTitle)
  lines.push('')

  if (lists.totalSeek > 0) {
    lines.push(labels.seekHeader(lists.totalSeek))
    const codes = lists.seek.flatMap((g) => g.items.map((s) => s.id))
    lines.push(codes.join(', '))
    lines.push('')
  }

  if (lists.totalOffer > 0) {
    lines.push(labels.offerHeader(lists.totalOffer))
    const codes = lists.offer.flatMap((g) => {
      return g.items.map((s) => {
        const dup = g.dupCounts.get(s.id) ?? 1
        return dup > 1 ? `${s.id}×${dup}` : s.id
      })
    })
    lines.push(codes.join(', '))
    lines.push('')
  }

  if (!lists.totalSeek && !lists.totalOffer) {
    lines.push(labels.empty)
  }

  lines.push(labels.footer(baseUrl))
  return lines.join('\n')
}

// ─── CSV ──────────────────────────────────────────────────────────────────

export function generateCsv(lists: SeekOfferLists): string {
  const rows: string[][] = [['typ', 'team_code', 'team_name', 'sticker_id', 'sticker_n', 'anzahl']]
  for (const group of lists.seek) {
    for (const s of group.items) {
      rows.push(['suche', group.team.code, group.team.name, s.id, String(s.n), '1'])
    }
  }
  for (const group of lists.offer) {
    for (const s of group.items) {
      const dup = group.dupCounts.get(s.id) ?? 1
      rows.push(['biete', group.team.code, group.team.name, s.id, String(s.n), String(dup)])
    }
  }
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n')
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// ─── Web Share API with clipboard fallback ────────────────────────────────

export type ShareResult =
  | { ok: true; method: 'native' }
  | { ok: true; method: 'clipboard' }
  | { ok: false; method: 'cancelled' }
  | { ok: false; method: 'failed' }

interface ShareInput {
  title: string
  text: string
}

/**
 * Try the native Web Share API first (iOS Safari ≥13, Android Chrome,
 * macOS Safari, Edge, Chrome desktop). Fall back to clipboard for
 * unsupported browsers (notably Firefox desktop) and for users who
 * cancel the native sheet without committing.
 *
 * The caller is responsible for showing a toast — the returned `method`
 * lets them pick the right wording ("shared!" vs "copied — paste it").
 */
export async function shareText({ title, text }: ShareInput): Promise<ShareResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text })
      return { ok: true, method: 'native' }
    } catch (err) {
      // User dismissed the share sheet — don't fall back to clipboard,
      // the user explicitly chose not to share.
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { ok: false, method: 'cancelled' }
      }
      // Anything else (NotAllowedError on insecure context, etc.) — fall
      // through to clipboard so the user still gets the text somehow.
    }
  }
  const copied = await copyToClipboard(text)
  return copied ? { ok: true, method: 'clipboard' } : { ok: false, method: 'failed' }
}

// ─── Clipboard helper ─────────────────────────────────────────────────────

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers / no permission
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      const ok = document.execCommand('copy')
      return ok
    } catch {
      return false
    } finally {
      document.body.removeChild(ta)
    }
  }
}

// ─── File downloads ───────────────────────────────────────────────────────

export function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
