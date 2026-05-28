import type { AlbumSlot, StickerType } from '@/lib/types'
import { NATIONAL_TEAMS } from './teams'

// The 980 base-album slots. Coca-Cola promos and DFB Glitter are intentionally
// excluded — they live in promos.ts as a separate set.
//
// Layout (matches the Panini WC 2026 base album printed checklist):
//   slots 1–20   → FWC specials (Cover, FIFA emblems, mascots, stadiums, museum…)
//                  IDs FWC-0 … FWC-19. Sticker #0 is the Panini logo / cover.
//   slots 21–980 → 48 teams × 20 stickers each (badge, team photo, 18 players)
//
// Player names + special labels are intentionally left blank — they are not
// in the public checklist as structured data. Users see the sticker number
// (e.g. "GER-1", "FWC-3") which is what Panini prints on the back. Labels
// can be filled in later from `src/data/player-names.csv`.

function buildAlbum(): AlbumSlot[] {
  const slots: AlbumSlot[] = []

  // FWC specials (FWC-0 … FWC-19). Same shape as a team block so the team
  // grid renders them uniformly. All 20 are foil in the printed album.
  for (let i = 0; i <= 19; i++) {
    slots.push({
      n: i + 1,
      id: `FWC-${i}`,
      teamCode: 'FWC',
      number: i,
      type: 'intro',
      hasFoil: true,
    })
  }

  // 48 teams × 20 stickers (21-980)
  let n = 21
  for (const team of NATIONAL_TEAMS) {
    for (let i = 0; i < 20; i++) {
      const numInTeam = i + 1
      let type: StickerType = 'player'
      if (numInTeam === 1) type = 'badge'
      else if (numInTeam === 2) type = 'team_photo'

      slots.push({
        n,
        id: `${team.code}-${numInTeam}`,
        teamCode: team.code,
        number: numInTeam,
        type,
        // Player name unknown — left empty until authoritative data is added.
        hasFoil: type === 'badge', // only the team badge is foil
      })
      n++
    }
  }

  return slots
}

export const ALBUM: AlbumSlot[] = buildAlbum()

if (ALBUM.length !== 980) {
  // This should never happen — it's a build-time sanity check.
  throw new Error(`Album should contain 980 slots, got ${ALBUM.length}`)
}

// ─── Lookup helpers ───────────────────────────────────────────────────────

/** All slots belonging to a given team code. */
export function getStickersForTeam(teamCode: string): AlbumSlot[] {
  return ALBUM.filter((s) => s.teamCode === teamCode)
}

/**
 * Resolve a user-typed code like "GER14", "ger-14", "GER 14" to an AlbumSlot.
 * Returns undefined if no match.
 */
export function findStickerByCode(input: string): AlbumSlot | undefined {
  const raw = input.toUpperCase().replace(/[\s_]/g, '').trim()
  // Try exact match first ("GER-1")
  const direct = ALBUM.find((s) => s.id === raw)
  if (direct) return direct
  // Try with inserted hyphen ("GER14" → "GER-14")
  const match = raw.match(/^([A-Z]{3})-?(\d{1,3})$/)
  if (!match) return undefined
  const [, code, num] = match
  return ALBUM.find((s) => s.teamCode === code && s.number === Number(num))
}

/** Look up a sticker by its 1-980 sequential number. */
export function findStickerByN(n: number): AlbumSlot | undefined {
  return ALBUM.find((s) => s.n === n)
}
