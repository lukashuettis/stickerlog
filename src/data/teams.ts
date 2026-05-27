import type { Team } from '@/lib/types'

// 48 national teams for the FIFA World Cup 2026, drawn 5 December 2025 in
// Washington D.C. Order follows the official group stage (A → L), matching
// the Panini album layout.
//
// Note on data: collections reference team codes (e.g. "GER-14"), NOT order
// or group letter — so if Panini's album rearranges or a group is later
// re-labelled, user data stays intact. Flag colours are 3-band approximations
// — NOT actual flags — to keep the project trademark-clean.

export const TEAMS: Team[] = [
  // ─── Group A ─────────────────────────────────────────────────────────────
  { code: 'MEX', name: 'Mexiko', nameEn: 'Mexico', group: 'A', confederation: 'CONCACAF', flagColors: ['#006847', '#ffffff', '#ce1126'] },
  { code: 'KOR', name: 'Südkorea', nameEn: 'South Korea', group: 'A', confederation: 'AFC', flagColors: ['#ffffff', '#cd2e3a', '#0047a0'] },
  { code: 'CZE', name: 'Tschechien', nameEn: 'Czechia', group: 'A', confederation: 'UEFA', flagColors: ['#ffffff', '#d7141a', '#11457e'] },
  { code: 'RSA', name: 'Südafrika', nameEn: 'South Africa', group: 'A', confederation: 'CAF', flagColors: ['#007a4d', '#ffb612', '#de3831'] },

  // ─── Group B ─────────────────────────────────────────────────────────────
  { code: 'SUI', name: 'Schweiz', nameEn: 'Switzerland', group: 'B', confederation: 'UEFA', flagColors: ['#ff0000', '#ffffff', '#ff0000'] },
  { code: 'CAN', name: 'Kanada', nameEn: 'Canada', group: 'B', confederation: 'CONCACAF', flagColors: ['#ff0000', '#ffffff', '#ff0000'] },
  { code: 'QAT', name: 'Katar', nameEn: 'Qatar', group: 'B', confederation: 'AFC', flagColors: ['#8a1538', '#ffffff', '#8a1538'] },
  { code: 'BIH', name: 'Bosnien & H.', nameEn: 'Bosnia & H.', group: 'B', confederation: 'UEFA', flagColors: ['#002f6c', '#ffd700', '#002f6c'] },

  // ─── Group C ─────────────────────────────────────────────────────────────
  { code: 'BRA', name: 'Brasilien', nameEn: 'Brazil', group: 'C', confederation: 'CONMEBOL', flagColors: ['#009c3b', '#ffdf00', '#002776'] },
  { code: 'MAR', name: 'Marokko', nameEn: 'Morocco', group: 'C', confederation: 'CAF', flagColors: ['#c1272d', '#ffffff', '#006233'] },
  { code: 'SCO', name: 'Schottland', nameEn: 'Scotland', group: 'C', confederation: 'UEFA', flagColors: ['#005eb8', '#ffffff', '#005eb8'] },
  { code: 'HAI', name: 'Haiti', nameEn: 'Haiti', group: 'C', confederation: 'CONCACAF', flagColors: ['#00209f', '#ce1126', '#00209f'] },

  // ─── Group D ─────────────────────────────────────────────────────────────
  { code: 'USA', name: 'USA', nameEn: 'USA', group: 'D', confederation: 'CONCACAF', flagColors: ['#bf0a30', '#ffffff', '#002868'] },
  { code: 'TUR', name: 'Türkei', nameEn: 'Türkiye', group: 'D', confederation: 'UEFA', flagColors: ['#e30a17', '#ffffff', '#e30a17'] },
  { code: 'AUS', name: 'Australien', nameEn: 'Australia', group: 'D', confederation: 'AFC', flagColors: ['#012169', '#ffffff', '#e4002b'] },
  { code: 'PAR', name: 'Paraguay', nameEn: 'Paraguay', group: 'D', confederation: 'CONMEBOL', flagColors: ['#d52b1e', '#ffffff', '#0038a8'] },

  // ─── Group E ─────────────────────────────────────────────────────────────
  { code: 'GER', name: 'Deutschland', nameEn: 'Germany', group: 'E', confederation: 'UEFA', flagColors: ['#000000', '#dd0000', '#ffce00'] },
  { code: 'ECU', name: 'Ecuador', nameEn: 'Ecuador', group: 'E', confederation: 'CONMEBOL', flagColors: ['#ffd200', '#034ea2', '#ed1c24'] },
  { code: 'CIV', name: 'Elfenbeinküste', nameEn: 'Côte d\'Ivoire', group: 'E', confederation: 'CAF', flagColors: ['#ff8200', '#ffffff', '#009a44'] },
  { code: 'CUW', name: 'Curaçao', nameEn: 'Curaçao', group: 'E', confederation: 'CONCACAF', flagColors: ['#002b7f', '#fff200', '#002b7f'] },

  // ─── Group F ─────────────────────────────────────────────────────────────
  { code: 'NED', name: 'Niederlande', nameEn: 'Netherlands', group: 'F', confederation: 'UEFA', flagColors: ['#ae1c28', '#ffffff', '#21468b'] },
  { code: 'JPN', name: 'Japan', nameEn: 'Japan', group: 'F', confederation: 'AFC', flagColors: ['#ffffff', '#bc002d', '#ffffff'] },
  { code: 'SWE', name: 'Schweden', nameEn: 'Sweden', group: 'F', confederation: 'UEFA', flagColors: ['#006aa7', '#fecc00', '#006aa7'] },
  { code: 'TUN', name: 'Tunesien', nameEn: 'Tunisia', group: 'F', confederation: 'CAF', flagColors: ['#e70013', '#ffffff', '#e70013'] },

  // ─── Group G ─────────────────────────────────────────────────────────────
  { code: 'BEL', name: 'Belgien', nameEn: 'Belgium', group: 'G', confederation: 'UEFA', flagColors: ['#000000', '#fae042', '#ed2939'] },
  { code: 'IRN', name: 'Iran', nameEn: 'Iran', group: 'G', confederation: 'AFC', flagColors: ['#239f40', '#ffffff', '#da0000'] },
  { code: 'EGY', name: 'Ägypten', nameEn: 'Egypt', group: 'G', confederation: 'CAF', flagColors: ['#ce1126', '#ffffff', '#000000'] },
  { code: 'NZL', name: 'Neuseeland', nameEn: 'New Zealand', group: 'G', confederation: 'OFC', flagColors: ['#012169', '#ffffff', '#cc142b'] },

  // ─── Group H ─────────────────────────────────────────────────────────────
  { code: 'ESP', name: 'Spanien', nameEn: 'Spain', group: 'H', confederation: 'UEFA', flagColors: ['#aa151b', '#f1bf00', '#aa151b'] },
  { code: 'URU', name: 'Uruguay', nameEn: 'Uruguay', group: 'H', confederation: 'CONMEBOL', flagColors: ['#0038a8', '#ffffff', '#0038a8'] },
  { code: 'KSA', name: 'Saudi-Arabien', nameEn: 'Saudi Arabia', group: 'H', confederation: 'AFC', flagColors: ['#006c35', '#ffffff', '#006c35'] },
  { code: 'CPV', name: 'Kap Verde', nameEn: 'Cape Verde', group: 'H', confederation: 'CAF', flagColors: ['#003893', '#ffffff', '#cf2027'] },

  // ─── Group I ─────────────────────────────────────────────────────────────
  { code: 'FRA', name: 'Frankreich', nameEn: 'France', group: 'I', confederation: 'UEFA', flagColors: ['#002395', '#ffffff', '#ed2939'] },
  { code: 'SEN', name: 'Senegal', nameEn: 'Senegal', group: 'I', confederation: 'CAF', flagColors: ['#00853f', '#fdef42', '#e31b23'] },
  { code: 'NOR', name: 'Norwegen', nameEn: 'Norway', group: 'I', confederation: 'UEFA', flagColors: ['#ef2b2d', '#ffffff', '#002868'] },
  { code: 'IRQ', name: 'Irak', nameEn: 'Iraq', group: 'I', confederation: 'AFC', flagColors: ['#ce1126', '#ffffff', '#000000'] },

  // ─── Group J ─────────────────────────────────────────────────────────────
  { code: 'ARG', name: 'Argentinien', nameEn: 'Argentina', group: 'J', confederation: 'CONMEBOL', flagColors: ['#75aadb', '#ffffff', '#75aadb'] },
  { code: 'AUT', name: 'Österreich', nameEn: 'Austria', group: 'J', confederation: 'UEFA', flagColors: ['#ed2939', '#ffffff', '#ed2939'] },
  { code: 'ALG', name: 'Algerien', nameEn: 'Algeria', group: 'J', confederation: 'CAF', flagColors: ['#006233', '#ffffff', '#d21034'] },
  { code: 'JOR', name: 'Jordanien', nameEn: 'Jordan', group: 'J', confederation: 'AFC', flagColors: ['#000000', '#ffffff', '#ce1126'] },

  // ─── Group K ─────────────────────────────────────────────────────────────
  { code: 'POR', name: 'Portugal', nameEn: 'Portugal', group: 'K', confederation: 'UEFA', flagColors: ['#046a38', '#da291c', '#ffe900'] },
  { code: 'COL', name: 'Kolumbien', nameEn: 'Colombia', group: 'K', confederation: 'CONMEBOL', flagColors: ['#fcd116', '#003893', '#ce1126'] },
  { code: 'COD', name: 'DR Kongo', nameEn: 'DR Congo', group: 'K', confederation: 'CAF', flagColors: ['#007fff', '#f7d518', '#ce1021'] },
  { code: 'UZB', name: 'Usbekistan', nameEn: 'Uzbekistan', group: 'K', confederation: 'AFC', flagColors: ['#1eb53a', '#ffffff', '#0099b5'] },

  // ─── Group L ─────────────────────────────────────────────────────────────
  { code: 'ENG', name: 'England', nameEn: 'England', group: 'L', confederation: 'UEFA', flagColors: ['#ffffff', '#ce1124', '#ffffff'] },
  { code: 'CRO', name: 'Kroatien', nameEn: 'Croatia', group: 'L', confederation: 'UEFA', flagColors: ['#ff0000', '#ffffff', '#171796'] },
  { code: 'GHA', name: 'Ghana', nameEn: 'Ghana', group: 'L', confederation: 'CAF', flagColors: ['#ce1126', '#fcd116', '#006b3f'] },
  { code: 'PAN', name: 'Panama', nameEn: 'Panama', group: 'L', confederation: 'CONCACAF', flagColors: ['#005293', '#ffffff', '#d21034'] },

  // Intro / FIFA Museum pseudo-team
  { code: 'INT', name: 'Cover & Spezial', nameEn: 'Cover & Specials', group: null, confederation: 'INT', flagColors: ['#0a5e3e', '#ffce00', '#0a5e3e'] },
]

/** Resolve the team's display name for the given locale (falls back to German). */
export function teamName(team: Team, locale: 'de' | 'en'): string {
  if (locale === 'en' && team.nameEn) return team.nameEn
  return team.name
}

/**
 * Look up a team by its 3-letter code (case-insensitive).
 * Returns undefined if the code is not a recognised team.
 */
export function findTeamByCode(code: string): Team | undefined {
  const normalized = code.toUpperCase().trim()
  return TEAMS.find((t) => t.code === normalized)
}

/** All 48 national teams in album order (group A first → L last). */
export const NATIONAL_TEAMS = TEAMS.filter((t) => t.code !== 'INT')
