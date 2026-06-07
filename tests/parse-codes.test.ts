import { describe, expect, it } from 'vitest'
import { parseStickerCodes } from '@/lib/parse-codes'

describe('parseStickerCodes — tolerant parser', () => {
  // The single most important behaviour: a user typing "GER 14" (with space)
  // must NOT be reported as two invalid tokens. This was the original
  // blocker that "Aunt Erika" would have given up on.
  it('accepts space between team code and number', () => {
    const result = parseStickerCodes('GER 14')
    expect(result).toHaveLength(1)
    expect(result[0].input).toBe('GER-14')
    expect(result[0].valid).toBe(true)
    expect(result[0].stickerId).toBe('GER-14')
  })

  it.each([
    ['GER-14', 'GER-14'],
    ['GER14', 'GER-14'],
    ['GER 14', 'GER-14'],
    ['ger 14', 'GER-14'],
    ['ger-14', 'GER-14'],
    ['Ger-14', 'GER-14'],
    ['GER  14', 'GER-14'], // multiple spaces
  ])('canonicalises %s → %s', (input, expected) => {
    const result = parseStickerCodes(input)
    expect(result[0]?.input).toBe(expected)
    expect(result[0]?.valid).toBe(true)
  })

  it('handles mixed-form list with commas', () => {
    const result = parseStickerCodes('GER 14, FRA-3, BRA 20, ger 5')
    expect(result.filter((r) => r.valid).map((r) => r.input)).toEqual([
      'GER-14',
      'FRA-3',
      'BRA-20',
      'GER-5',
    ])
  })

  it('handles linebreaks and tabs as separators', () => {
    const result = parseStickerCodes('GER 14\nFRA 5\t BRA20')
    expect(result.map((r) => r.valid)).toEqual([true, true, true])
  })

  it('returns invalid tokens for unrecognised codes', () => {
    const result = parseStickerCodes('GER 14, XYZ99, GER 5')
    expect(result.find((r) => r.input === 'XYZ-99')?.valid).toBe(false)
    expect(result.filter((r) => r.valid)).toHaveLength(2)
  })

  // FWC = the 20 special stickers (cover, FIFA emblems, stadiums, museum).
  // Numbered FWC-0 to FWC-19 — same matcher tolerance as country codes.
  it.each([
    ['FWC 0', 'FWC-0'],
    ['FWC-0', 'FWC-0'],
    ['FWC0', 'FWC-0'],
    ['fwc 0', 'FWC-0'],
    ['FWC 19', 'FWC-19'],
    ['fwc19', 'FWC-19'],
  ])('accepts FWC specials: %s → %s', (input, expected) => {
    const result = parseStickerCodes(input)
    expect(result[0]?.input).toBe(expected)
    expect(result[0]?.valid).toBe(true)
    expect(result[0]?.stickerId).toBe(expected)
  })

  it('handles empty/whitespace input gracefully', () => {
    expect(parseStickerCodes('')).toEqual([])
    expect(parseStickerCodes('   ')).toEqual([])
    expect(parseStickerCodes('\n  ,, ; ')).toEqual([])
  })

  it('flags clearly malformed standalone tokens as invalid', () => {
    const result = parseStickerCodes('hello world')
    expect(result.every((r) => !r.valid)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it.each([
    ['CC-1', 'CC-1'],
    ['CC1', 'CC-1'],
    ['cc-1', 'CC-1'],
    ['cc 1', 'CC-1'],
    ['CC-12', 'CC-12'],
  ])('recognises 2-letter CC promo code %p as %p', (input, expected) => {
    const result = parseStickerCodes(input)
    expect(result.find((r) => r.valid)?.stickerId).toBe(expected)
  })
})
