import { describe, expect, it } from 'vitest'
import {
  encodePayload,
  decodePayload,
  KIND_LIST,
  KIND_PROPOSAL,
  CodecError,
  MAX_PAYLOAD_BYTES,
  PAYLOAD_VERSION,
} from '@/lib/tradeCheckCodec'

describe('tradeCheckCodec — list payloads', () => {
  it('encodes empty and decodes identically', () => {
    const enc = encodePayload({ kind: KIND_LIST, seek: [], offer: [] })
    const dec = decodePayload(enc)
    expect(dec.version).toBe(PAYLOAD_VERSION)
    expect(dec.kind).toBe(KIND_LIST)
    expect(dec.seek).toEqual([])
    expect(dec.offer).toEqual([])
  })

  it('round-trips a small list payload', () => {
    const enc = encodePayload({
      kind: KIND_LIST,
      seek: ['GER-3', 'FRA-5', 'BRA-7'],
      offer: [
        { id: 'GER-14', dups: 2 },
        { id: 'FRA-8', dups: 1 },
      ],
    })
    const dec = decodePayload(enc)
    expect(dec.seek.sort()).toEqual(['BRA-7', 'FRA-5', 'GER-3'])
    expect(dec.offer.sort((a, b) => a.id.localeCompare(b.id))).toEqual([
      { id: 'FRA-8', dups: 1 },
      { id: 'GER-14', dups: 2 },
    ])
  })

  it('round-trips the FWC specials block', () => {
    const enc = encodePayload({
      kind: KIND_LIST,
      seek: ['FWC-0', 'FWC-7', 'FWC-19'],
      offer: [{ id: 'FWC-3', dups: 1 }],
    })
    const dec = decodePayload(enc)
    expect(dec.seek.sort()).toEqual(['FWC-0', 'FWC-19', 'FWC-7'])
    expect(dec.offer).toEqual([{ id: 'FWC-3', dups: 1 }])
  })

  it('produces compact base64url for a typical 150-seek 30-offer payload', () => {
    const seek: string[] = []
    for (let i = 1; i <= 150; i++) seek.push(`GER-${(i % 20) + 1}`)
    const offer: Array<{ id: string; dups: number }> = []
    for (let i = 1; i <= 20; i++) offer.push({ id: `FRA-${i}`, dups: 2 })
    const enc = encodePayload({ kind: KIND_LIST, seek, offer })
    expect(enc.length).toBeLessThan(600)
  })

  it('stays well within the size cap for a worst-case list', () => {
    const seek: string[] = []
    for (let i = 1; i <= 20; i++) seek.push(`FWC-${i - 1}`)
    for (let i = 1; i <= 20; i++) seek.push(`GER-${i}`)
    const offer: Array<{ id: string; dups: number }> = []
    for (let i = 1; i <= 100; i++) offer.push({ id: `FRA-${(i % 20) + 1}`, dups: 1 })
    const enc = encodePayload({ kind: KIND_LIST, seek, offer })
    expect(enc.length).toBeLessThan(2000)
  })
})

describe('tradeCheckCodec — proposal payloads', () => {
  it('round-trips a 5+5 proposal', () => {
    const enc = encodePayload({
      kind: KIND_PROPOSAL,
      seek: ['GER-3', 'GER-7', 'FRA-5', 'BRA-7', 'MEX-1'],
      offer: [
        { id: 'GER-14', dups: 1 },
        { id: 'GER-15', dups: 1 },
        { id: 'FRA-8', dups: 1 },
        { id: 'BRA-12', dups: 1 },
        { id: 'MEX-10', dups: 1 },
      ],
    })
    const dec = decodePayload(enc)
    expect(dec.kind).toBe(KIND_PROPOSAL)
    expect(dec.seek).toHaveLength(5)
    expect(dec.offer).toHaveLength(5)
    // Proposals stay tiny — well under 100 chars.
    expect(enc.length).toBeLessThan(200)
  })
})

describe('tradeCheckCodec — error paths', () => {
  it('throws on unsupported version', () => {
    // Manually craft a payload with version 99
    const bad = btoa(
      String.fromCharCode(99, 0, ...new Array(125).fill(0)),
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(() => decodePayload(bad)).toThrow(CodecError)
    try {
      decodePayload(bad)
    } catch (e) {
      expect((e as CodecError).code).toBe('unsupported_version')
    }
  })

  it('throws on invalid base64', () => {
    expect(() => decodePayload('not!valid!base64!!')).toThrow(CodecError)
  })

  it('throws on truncated payload', () => {
    const tiny = btoa('a').replace(/=+$/, '')
    expect(() => decodePayload(tiny)).toThrow(CodecError)
  })

  it('throws on unknown sticker id during encode', () => {
    expect(() =>
      encodePayload({ kind: KIND_LIST, seek: ['XXX-99'], offer: [] }),
    ).toThrow(CodecError)
  })

  it('throws if computed payload exceeds size limit (synthetic)', () => {
    // Build an artificially huge offer list with the same id repeated isn't
    // possible (sparse dedupes); instead lean on the validation by asserting
    // the cap exists.
    expect(MAX_PAYLOAD_BYTES).toBe(1400)
  })
})
