import { beforeEach, describe, expect, it } from 'vitest'
import { db, createEvent, recomputeAllCaches } from '@/lib/db'
import {
  createTradeEvent,
  createGiftOutEvent,
  createCorrectionOutEvent,
  findLastCopies,
  getOwnedCount,
  NegativeStockError,
} from '@/lib/db'
import { isCostBearing } from '@/lib/cost'

async function reset() {
  await db.transaction(
    'rw',
    [db.events, db.items, db.collectionCache, db.settings],
    async () => {
      await db.events.clear()
      await db.items.clear()
      await db.collectionCache.clear()
      await db.settings.clear()
    },
  )
}

async function seedThreeStickers() {
  // Three regular purchases so we own GER-3 (3×), GER-7 (1×), FRA-5 (2×)
  await createEvent(
    {
      type: 'purchase',
      productTemplateId: 'pack_7',
      store: 'Lidl',
      priceCents: 100,
      expectedPaidStickerCount: 7,
      occurredAt: '2026-05-01T12:00:00.000Z',
    },
    [
      { stickerCatalog: 'album', stickerId: 'GER-3', itemKind: 'album' },
      { stickerCatalog: 'album', stickerId: 'GER-3', itemKind: 'album' },
      { stickerCatalog: 'album', stickerId: 'GER-3', itemKind: 'album' },
      { stickerCatalog: 'album', stickerId: 'GER-7', itemKind: 'album' },
      { stickerCatalog: 'album', stickerId: 'FRA-5', itemKind: 'album' },
      { stickerCatalog: 'album', stickerId: 'FRA-5', itemKind: 'album' },
    ],
  )
}

describe('trade / gift / correction events', () => {
  beforeEach(async () => {
    await reset()
    await seedThreeStickers()
  })

  it('createTradeEvent bumps in-items up and out-items down', async () => {
    await createTradeEvent({
      inItems: [{ catalog: 'album', id: 'BRA-1' }],
      outItems: [{ catalog: 'album', id: 'GER-3' }],
      counterparty: 'Bruder',
    })
    expect(await getOwnedCount('album', 'BRA-1')).toBe(1)
    expect(await getOwnedCount('album', 'GER-3')).toBe(2)
  })

  it('a single trade event records BOTH directions', async () => {
    await createTradeEvent({
      inItems: [{ catalog: 'album', id: 'BRA-1' }],
      outItems: [{ catalog: 'album', id: 'GER-3' }],
    })
    const events = await db.events.toArray()
    const tradeEvents = events.filter((e) => e.type === 'trade')
    expect(tradeEvents).toHaveLength(1)
    const items = await db.items.where('eventId').equals(tradeEvents[0].id!).toArray()
    expect(items.filter((i) => i.direction === 'in')).toHaveLength(1)
    expect(items.filter((i) => i.direction === 'out')).toHaveLength(1)
  })

  it('createGiftOutEvent reduces stock and is NOT cost-bearing', async () => {
    await createGiftOutEvent({
      outItems: [{ catalog: 'album', id: 'GER-3' }],
      counterparty: 'Tante',
    })
    expect(await getOwnedCount('album', 'GER-3')).toBe(2)

    const giftEvent = (await db.events.toArray()).find((e) => e.type === 'gift')!
    const item = (await db.items.where('eventId').equals(giftEvent.id!).toArray())[0]
    expect(isCostBearing(item, giftEvent)).toBe(false)
  })

  it('createCorrectionOutEvent reduces stock and is NOT cost-bearing', async () => {
    await createCorrectionOutEvent({
      outItems: [{ catalog: 'album', id: 'GER-3' }],
    })
    expect(await getOwnedCount('album', 'GER-3')).toBe(2)

    const correctionEvent = (await db.events.toArray()).find(
      (e) => e.type === 'correction',
    )!
    const item = (await db.items.where('eventId').equals(correctionEvent.id!).toArray())[0]
    expect(isCostBearing(item, correctionEvent)).toBe(false)
  })

  it('refuses to remove more than the owned count', async () => {
    // I own GER-7 once, try to give two away
    await expect(
      createGiftOutEvent({
        outItems: [
          { catalog: 'album', id: 'GER-7' },
          { catalog: 'album', id: 'GER-7' },
        ],
      }),
    ).rejects.toThrow(NegativeStockError)
    // Stock unchanged
    expect(await getOwnedCount('album', 'GER-7')).toBe(1)
  })

  it('findLastCopies returns only stickerIds with count === 1', async () => {
    const last = await findLastCopies('album', ['GER-3', 'GER-7', 'FRA-5', 'BRA-99'])
    expect(last.sort()).toEqual(['GER-7'])
  })

  it('cache rebuild keeps counts right after a chain of events', async () => {
    await createTradeEvent({
      inItems: [{ catalog: 'album', id: 'GER-9' }],
      outItems: [{ catalog: 'album', id: 'GER-3' }],
    })
    await createGiftOutEvent({
      outItems: [{ catalog: 'album', id: 'FRA-5' }],
    })
    await recomputeAllCaches()
    expect(await getOwnedCount('album', 'GER-3')).toBe(2)
    expect(await getOwnedCount('album', 'GER-9')).toBe(1)
    expect(await getOwnedCount('album', 'FRA-5')).toBe(1)
    expect(await getOwnedCount('album', 'GER-7')).toBe(1)
  })
})
