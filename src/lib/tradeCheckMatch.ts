/**
 * Pure matching logic. Given the OTHER side's seek/offer lists and my
 * current ownership, return what's mutually interesting.
 *
 * No fairness words anywhere — UI copy decides what to call each state,
 * and we deliberately avoid suggesting one side "wins" or "loses".
 */

export type MatchEmotion = 'great' | 'good' | 'one_sided_me' | 'one_sided_them' | 'none'

export interface OtherSide {
  /** stickerIds they're looking for */
  seek: string[]
  /** stickers they have surplus of, with surplus count */
  offer: Array<{ id: string; dups: number }>
}

export interface MySide {
  /** stickerId → my current count (0 = missing, ≥1 = owned, count-1 are dups) */
  ownedCount: Map<string, number>
}

export interface ForMeEntry {
  id: string
  theirDups: number
}

export interface ForThemEntry {
  id: string
  myDups: number
}

export interface MatchResult {
  /** Stickers they offer that I'm missing — I'd want these */
  forMe: ForMeEntry[]
  /** Stickers they seek that I have a duplicate of — I could give these */
  forThem: ForThemEntry[]
  /** Stickers they offer that I already own (not interesting either way) */
  alreadyHave: string[]
  /** Stickers they seek that I don't have a duplicate of (can't help) */
  cantOffer: string[]
  emotion: MatchEmotion
}

const GREAT_THRESHOLD = 3 // ≥3 on each side feels meaningfully matched

export function matchSides(other: OtherSide, my: MySide): MatchResult {
  const forMe: ForMeEntry[] = []
  const alreadyHave: string[] = []
  for (const { id, dups } of other.offer) {
    const myCount = my.ownedCount.get(id) ?? 0
    if (myCount === 0) {
      forMe.push({ id, theirDups: dups })
    } else {
      alreadyHave.push(id)
    }
  }

  const forThem: ForThemEntry[] = []
  const cantOffer: string[] = []
  for (const id of other.seek) {
    const myCount = my.ownedCount.get(id) ?? 0
    const myDups = Math.max(0, myCount - 1)
    if (myDups >= 1) {
      forThem.push({ id, myDups })
    } else {
      cantOffer.push(id)
    }
  }

  const emotion = pickEmotion(forMe.length, forThem.length)

  // Stable order — sticker codes naturally group team-wise.
  forMe.sort((a, b) => a.id.localeCompare(b.id))
  forThem.sort((a, b) => a.id.localeCompare(b.id))

  return { forMe, forThem, alreadyHave, cantOffer, emotion }
}

function pickEmotion(forMe: number, forThem: number): MatchEmotion {
  if (forMe === 0 && forThem === 0) return 'none'
  if (forMe >= GREAT_THRESHOLD && forThem >= GREAT_THRESHOLD) return 'great'
  if (forMe > 0 && forThem === 0) return 'one_sided_me'
  if (forMe === 0 && forThem > 0) return 'one_sided_them'
  return 'good'
}
