import { findStickerByCode } from '@/data/album'

export interface ParsedCode {
  /** What the user typed, normalised to upper-case and canonical "GER-14" form when matched. */
  input: string
  /** Album-slot id if the code matched a known sticker (e.g. "GER-14"). */
  stickerId?: string
  valid: boolean
}

/**
 * Tolerant parser for the quick-add textarea.
 *
 * Accepts mixed forms in any order:
 *   - "GER-14"  (canonical)
 *   - "GER14"   (no separator)
 *   - "GER 14"  (space between)
 *   - "ger 14"  (lower-case)
 *   - "ger-14"  (lower-case + hyphen)
 *   - Mixed input like "GER 14, FRA-3, BRA 20 ger 5" all in one line
 *
 * Strategy:
 *   1. Pull every (3 letters + optional separator + 1–3 digits) pair as a
 *      single canonical match, regardless of separator.
 *   2. Anything between/after matches that isn't whitespace/punct is reported
 *      as `invalid` so the user sees what couldn't be parsed.
 */
export function parseStickerCodes(text: string): ParsedCode[] {
  const normalized = text.toUpperCase()
  const out: ParsedCode[] = []
  const matchRegex = /([A-Z]{3})\s*-?\s*(\d{1,3})/g
  const matchedRanges: Array<[number, number]> = []
  let m: RegExpExecArray | null
  while ((m = matchRegex.exec(normalized)) !== null) {
    const display = `${m[1]}-${m[2]}`
    const slot = findStickerByCode(display)
    out.push({ input: display, stickerId: slot?.id, valid: !!slot })
    matchedRanges.push([m.index, m.index + m[0].length])
  }
  let cursor = 0
  for (const [start, end] of matchedRanges) {
    const gap = normalized.slice(cursor, start)
    for (const tok of gap.split(/[\s,;\n]+/)) {
      const t = tok.trim()
      if (t.length > 0) out.push({ input: tok.toUpperCase(), valid: false })
    }
    cursor = end
  }
  const tail = normalized.slice(cursor)
  for (const tok of tail.split(/[\s,;\n]+/)) {
    const t = tok.trim()
    if (t.length > 0) out.push({ input: tok.toUpperCase(), valid: false })
  }
  return out
}
