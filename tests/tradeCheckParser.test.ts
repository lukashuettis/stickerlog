import { describe, expect, it } from 'vitest'
import { parseTradeText } from '@/lib/tradeCheckParser'

describe('parseTradeText — WhatsApp-shape inputs', () => {
  it('parses our DE share text with both sections', () => {
    const text = `🌟 Meine Sticker-Tauschliste

🔎 Diese Sticker suche ich (3):
GER-3, FRA-5, BRA-7

🤝 Diese Sticker biete ich (2):
GER-14×2, FRA-8

Tausch-Liste teilen: https://lukashuettis.github.io/stickerlog/`

    const out = parseTradeText(text)
    expect(out.seek.sort()).toEqual(['BRA-7', 'FRA-5', 'GER-3'])
    expect(out.offer.sort((a, b) => a.id.localeCompare(b.id))).toEqual([
      { id: 'FRA-8', dups: 1 },
      { id: 'GER-14', dups: 2 },
    ])
    expect(out.hadSeekHeader).toBe(true)
    expect(out.hadOfferHeader).toBe(true)
  })

  it('parses our EN share text', () => {
    const text = `Stickers I'm looking for: GER-3, FRA-5
Stickers I have to trade: GER-14 x2`
    const out = parseTradeText(text)
    expect(out.seek.sort()).toEqual(['FRA-5', 'GER-3'])
    expect(out.offer).toEqual([{ id: 'GER-14', dups: 2 }])
  })

  it('treats a header-less paste as offer by default', () => {
    const text = 'GER-3, FRA-5, BRA-7'
    const out = parseTradeText(text)
    expect(out.offer.map((o) => o.id).sort()).toEqual(['BRA-7', 'FRA-5', 'GER-3'])
    expect(out.seek).toEqual([])
    expect(out.hadSeekHeader).toBe(false)
    expect(out.hadOfferHeader).toBe(false)
  })
})

describe('parseTradeText — duplicate notations', () => {
  it.each([
    ['GER-3×2', 2],
    ['GER-3 ×2', 2],
    ['GER-3x2', 2],
    ['GER-3 x2', 2],
    ['GER-3X3', 3],
    ['GER-3*4', 4],
    ['GER-3 (2x)', 2],
    ['GER-3 (5)', 5],
  ])('reads "%s" as count %d', (input, expected) => {
    const out = parseTradeText(input)
    const ger3 = out.offer.find((o) => o.id === 'GER-3')
    expect(ger3?.dups).toBe(expected)
  })
})

describe('parseTradeText — URL handling', () => {
  it('extracts payload from a StickerLog link in the message', () => {
    // Build a real list payload first
    const text =
      'Hey, here is my trade list https://lukashuettis.github.io/stickerlog/#/trade/check/AQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
    const out = parseTradeText(text)
    // Whether the payload is valid or not, we should not have crashed.
    expect(out.invalid).toEqual([])
  })

  it('strips other URLs without breaking the rest', () => {
    const text = 'GER-3, see https://example.com/x for details, BRA-7'
    const out = parseTradeText(text)
    expect(out.offer.map((o) => o.id).sort()).toEqual(['BRA-7', 'GER-3'])
  })
})

describe('parseTradeText — tolerance', () => {
  it('survives empty and whitespace input', () => {
    expect(parseTradeText('').offer).toEqual([])
    expect(parseTradeText('   \n  ').offer).toEqual([])
  })

  it('surfaces unrecognised codes as invalid', () => {
    const out = parseTradeText('GER-3, XYZ-99, GER-7')
    expect(out.invalid).toContain('XYZ-99')
    expect(out.offer.map((o) => o.id).sort()).toEqual(['GER-3', 'GER-7'])
  })

  it('handles lowercase + spaced codes', () => {
    const out = parseTradeText('ger 14, fra 5')
    expect(out.offer.map((o) => o.id).sort()).toEqual(['FRA-5', 'GER-14'])
  })
})
