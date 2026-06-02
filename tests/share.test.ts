import { describe, expect, it } from 'vitest'
import { generateWhatsAppText, type SeekOfferLists } from '@/lib/export'
import type { AlbumSlot, Team } from '@/lib/types'

const GER: Team = {
  code: 'GER',
  name: 'Deutschland',
  nameEn: 'Germany',
  group: 'A',
  confederation: 'UEFA',
  flagColors: ['#000', '#dd0000', '#ffce00'],
}
const FRA: Team = {
  code: 'FRA',
  name: 'Frankreich',
  nameEn: 'France',
  group: 'I',
  confederation: 'UEFA',
  flagColors: ['#002395', '#fff', '#ed2939'],
}

const slot = (id: string, teamCode: string, n: number): AlbumSlot => ({
  id,
  n,
  teamCode,
  number: n,
  type: 'player',
  hasFoil: false,
})

const sampleLists: SeekOfferLists = {
  seek: [{ team: GER, items: [slot('GER-3', 'GER', 3), slot('GER-7', 'GER', 7)] }],
  offer: [
    {
      team: FRA,
      items: [slot('FRA-5', 'FRA', 5)],
      dupCounts: new Map([['FRA-5', 2]]),
    },
  ],
  totalSeek: 2,
  totalOffer: 1,
}

const labels = {
  listTitle: 'TITLE',
  seekHeader: (n: number) => `SEEK_HEADER ${n}`,
  offerHeader: (n: number) => `OFFER_HEADER ${n}`,
  empty: 'EMPTY',
  footer: (url: string) => `FOOTER ${url}`,
}

describe('generateWhatsAppText — tab-aware share', () => {
  // The user-reported bug: brother shared the offer tab, recipient saw the
  // seek list because we were sending BOTH lists with seek on top. Lock down
  // the fix so a future refactor can't reintroduce it.

  it('includes only the seek list when only=seek', () => {
    const out = generateWhatsAppText(sampleLists, labels, {
      only: 'seek',
      baseUrl: 'http://x',
    })
    expect(out).toContain('SEEK_HEADER 2')
    expect(out).toContain('GER-3, GER-7')
    expect(out).not.toContain('OFFER_HEADER')
    expect(out).not.toContain('FRA-5')
  })

  it('includes only the offer list when only=offer', () => {
    const out = generateWhatsAppText(sampleLists, labels, {
      only: 'offer',
      baseUrl: 'http://x',
    })
    expect(out).toContain('OFFER_HEADER 1')
    expect(out).toContain('FRA-5×2')
    expect(out).not.toContain('SEEK_HEADER')
    expect(out).not.toContain('GER-3')
  })

  it('includes both lists when only=both (default for CSV-style exports)', () => {
    const out = generateWhatsAppText(sampleLists, labels, { baseUrl: 'http://x' })
    expect(out).toContain('SEEK_HEADER 2')
    expect(out).toContain('OFFER_HEADER 1')
    expect(out).toContain('GER-3, GER-7')
    expect(out).toContain('FRA-5×2')
  })

  it('falls back to the empty label if the only-side has nothing', () => {
    const emptyOffer: SeekOfferLists = { ...sampleLists, offer: [], totalOffer: 0 }
    const out = generateWhatsAppText(emptyOffer, labels, {
      only: 'offer',
      baseUrl: 'http://x',
    })
    expect(out).toContain('EMPTY')
    expect(out).not.toContain('OFFER_HEADER')
  })

  it('always renders title and footer regardless of side', () => {
    const out = generateWhatsAppText(sampleLists, labels, {
      only: 'offer',
      baseUrl: 'http://x',
    })
    expect(out.startsWith('TITLE')).toBe(true)
    expect(out.endsWith('FOOTER http://x')).toBe(true)
  })
})
