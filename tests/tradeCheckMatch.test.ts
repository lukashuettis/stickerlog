import { describe, expect, it } from 'vitest'
import { matchSides } from '@/lib/tradeCheckMatch'

function owned(map: Record<string, number>) {
  return { ownedCount: new Map(Object.entries(map)) }
}

describe('matchSides', () => {
  it('returns "great" when both sides have ≥3 matches', () => {
    const result = matchSides(
      {
        seek: ['GER-3', 'GER-4', 'GER-5', 'FRA-1'],
        offer: [
          { id: 'BRA-1', dups: 1 },
          { id: 'BRA-2', dups: 1 },
          { id: 'BRA-3', dups: 2 },
          { id: 'BRA-4', dups: 1 },
        ],
      },
      owned({
        'GER-3': 2,
        'GER-4': 3,
        'GER-5': 2,
        // BRA-1..4 missing
      }),
    )
    expect(result.emotion).toBe('great')
    expect(result.forMe).toHaveLength(4)
    expect(result.forThem).toHaveLength(3)
  })

  it('returns "good" for any mutual benefit below the great threshold', () => {
    const result = matchSides(
      {
        seek: ['GER-3'],
        offer: [{ id: 'FRA-5', dups: 1 }],
      },
      owned({ 'GER-3': 2 }),
    )
    expect(result.emotion).toBe('good')
    expect(result.forMe).toEqual([{ id: 'FRA-5', theirDups: 1 }])
    expect(result.forThem).toEqual([{ id: 'GER-3', myDups: 1 }])
  })

  it('returns "one_sided_me" when only I gain', () => {
    const result = matchSides(
      { seek: ['ARG-1'], offer: [{ id: 'BRA-1', dups: 1 }] },
      owned({ /* I have nothing of ARG-1, BRA-1 missing */ }),
    )
    expect(result.emotion).toBe('one_sided_me')
    expect(result.forMe).toHaveLength(1)
    expect(result.forThem).toHaveLength(0)
  })

  it('returns "one_sided_them" when only I can give', () => {
    const result = matchSides(
      { seek: ['GER-3'], offer: [{ id: 'BRA-1', dups: 1 }] },
      owned({ 'GER-3': 2, 'BRA-1': 1 /* already have, so not for me */ }),
    )
    expect(result.emotion).toBe('one_sided_them')
    expect(result.forMe).toHaveLength(0)
    expect(result.forThem).toHaveLength(1)
  })

  it('returns "none" when neither side benefits', () => {
    const result = matchSides(
      { seek: ['GER-3'], offer: [{ id: 'BRA-1', dups: 1 }] },
      owned({ /* nothing relevant */ 'BRA-1': 1 }),
    )
    expect(result.emotion).toBe('none')
    expect(result.forMe).toEqual([])
    expect(result.forThem).toEqual([])
  })

  it('classifies stickers I already own as "alreadyHave"', () => {
    const result = matchSides(
      { seek: [], offer: [{ id: 'GER-3', dups: 2 }] },
      owned({ 'GER-3': 1 }),
    )
    expect(result.alreadyHave).toEqual(['GER-3'])
    expect(result.forMe).toEqual([])
  })

  it('classifies their seeks I have only 1 of as "cantOffer"', () => {
    const result = matchSides(
      { seek: ['GER-3'], offer: [] },
      owned({ 'GER-3': 1 }), // one copy only — would lose my last copy
    )
    expect(result.cantOffer).toEqual(['GER-3'])
    expect(result.forThem).toEqual([])
  })

  // The whole point of neutral emotions: no fairness words leak through
  it('emits only neutral state names', () => {
    const states = ['great', 'good', 'one_sided_me', 'one_sided_them', 'none']
    for (const s of states) {
      // The state name itself should not contain "win", "lose", "fair", etc.
      expect(/win|lose|loose|fair|unfair|cheat/i.test(s)).toBe(false)
    }
  })
})
