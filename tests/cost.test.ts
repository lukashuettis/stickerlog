import { describe, expect, it } from 'vitest'
import {
  aggregateCostStats,
  aggregateSideCounts,
  allocatedCostPerItem,
  hitRatePerTemplate,
  isCostBearing,
} from '@/lib/cost'
import type { AcquisitionEvent, AcquisitionItem } from '@/lib/types'

const purchase = (
  id: number,
  priceCents: number,
  expectedPaidStickerCount: number,
  productTemplateId = 'pack_7',
): AcquisitionEvent => ({
  id,
  type: 'purchase',
  occurredAt: '2026-05-01',
  productTemplateId,
  priceCents,
  expectedPaidStickerCount,
})

const item = (
  id: number,
  eventId: number,
  overrides: Partial<AcquisitionItem> = {},
): AcquisitionItem => ({
  id,
  eventId,
  stickerCatalog: 'album',
  stickerId: `GER-${id}`,
  direction: 'in',
  itemKind: 'album',
  wasNew: true,
  acquiredAt: '2026-05-01',
  sequence: id,
  ...overrides,
})

describe('isCostBearing', () => {
  it('counts album-in stickers from purchases', () => {
    expect(isCostBearing(item(1, 1), purchase(1, 150, 7))).toBe(true)
  })

  it('rejects bonus items even on purchases', () => {
    expect(
      isCostBearing(item(1, 1, { itemKind: 'bonus' }), purchase(1, 150, 7)),
    ).toBe(false)
  })

  it('rejects out-direction', () => {
    expect(
      isCostBearing(item(1, 1, { direction: 'out' }), purchase(1, 150, 7)),
    ).toBe(false)
  })

  it('rejects trade/gift/promo/correction events', () => {
    const tradeItem = item(1, 1)
    const tradeEvent: AcquisitionEvent = { id: 1, type: 'trade', occurredAt: '2026-05-01' }
    expect(isCostBearing(tradeItem, tradeEvent)).toBe(false)
  })
})

describe('allocatedCostPerItem', () => {
  it('divides event price by expected sticker count', () => {
    expect(allocatedCostPerItem(purchase(1, 15000, 700))).toBeCloseTo(21.428, 2)
  })

  it('returns 0 if event has no price or expected count', () => {
    expect(allocatedCostPerItem(purchase(1, 0, 7))).toBe(0)
    expect(
      allocatedCostPerItem({ id: 1, type: 'purchase', occurredAt: '2026-05-01' }),
    ).toBe(0)
  })

  it('returns 0 for non-purchases', () => {
    expect(
      allocatedCostPerItem({
        id: 1,
        type: 'trade',
        occurredAt: '2026-05-01',
        priceCents: 100,
        expectedPaidStickerCount: 7,
      }),
    ).toBe(0)
  })
})

describe('aggregateCostStats', () => {
  it('returns zeros when there are no events', () => {
    const stats = aggregateCostStats([], [])
    expect(stats.totalSpentCents).toBe(0)
    expect(stats.purchaseCount).toBe(0)
    expect(stats.openedRegularPaid).toBe(0)
    expect(stats.hitRate).toBe(0)
    expect(stats.costPerNewCents).toBe(0)
  })

  it('matches the documented Box-100 example (150 € / 700, 21 opened, 18 new)', () => {
    const event = purchase(1, 15000, 700, 'box_100')
    const items: AcquisitionItem[] = []
    // 18 brand new items
    for (let i = 0; i < 18; i++) {
      items.push(item(i + 1, 1, { stickerId: `GER-${i + 1}`, wasNew: true }))
    }
    // 3 duplicates from the same box
    for (let i = 0; i < 3; i++) {
      items.push(item(100 + i, 1, { stickerId: `GER-${i + 1}`, wasNew: false }))
    }

    const stats = aggregateCostStats([event], items)

    expect(stats.totalSpentCents).toBe(15000)
    expect(stats.openedRegularPaid).toBe(21)
    expect(stats.newRegularPaid).toBe(18)
    expect(stats.allocatedOpenedCents).toBeCloseTo(21 * (15000 / 700), 1)
    expect(stats.hitRate).toBeCloseTo(18 / 21, 4)
    expect(Math.round(stats.costPerNewCents)).toBe(25) // 4.50€ / 18 = 0.25€
    expect(Math.round(stats.costPerOpenedCents)).toBe(21) // 4.50€ / 21 = 0.21€
  })

  it('excludes bonus items from cost & hit rate', () => {
    const event = purchase(1, 700, 7) // 7 € for 7 stickers
    const items = [
      ...Array.from({ length: 7 }, (_, i) =>
        item(i + 1, 1, { stickerId: `GER-${i + 1}` }),
      ),
      // Two extra bonus items shouldn't reduce €/new
      item(8, 1, { stickerId: 'DFB-1', itemKind: 'bonus', stickerCatalog: 'dfb_special' }),
      item(9, 1, { stickerId: 'DFB-2', itemKind: 'bonus', stickerCatalog: 'dfb_special' }),
    ]

    const stats = aggregateCostStats([event], items)
    expect(stats.openedRegularPaid).toBe(7)
    expect(stats.newRegularPaid).toBe(7)
    expect(Math.round(stats.costPerNewCents)).toBe(100) // 7€ / 7 = 1€
  })

  it('ignores trade/gift/correction events', () => {
    const purchaseE = purchase(1, 150, 7)
    const tradeE: AcquisitionEvent = { id: 2, type: 'trade', occurredAt: '2026-05-02' }
    const giftE: AcquisitionEvent = { id: 3, type: 'gift', occurredAt: '2026-05-03' }
    const items = [
      item(1, 1, { wasNew: true }), // counted
      item(2, 2, { stickerId: 'ITA-1' }), // ignored — trade
      item(3, 3, { stickerId: 'ESP-1' }), // ignored — gift
    ]
    const stats = aggregateCostStats([purchaseE, tradeE, giftE], items)
    expect(stats.openedRegularPaid).toBe(1)
    expect(stats.newRegularPaid).toBe(1)
    expect(stats.totalSpentCents).toBe(150) // only purchase
  })
})

describe('aggregateSideCounts', () => {
  it('separates trade in/out, gifts, bonuses, corrections', () => {
    const events: AcquisitionEvent[] = [
      { id: 1, type: 'trade', occurredAt: '2026-05-01' },
      { id: 2, type: 'gift', occurredAt: '2026-05-02' },
      { id: 3, type: 'correction', occurredAt: '2026-05-03' },
      purchase(4, 150, 7),
    ]
    const items = [
      // trade: 2 in, 1 out
      item(1, 1),
      item(2, 1),
      item(3, 1, { direction: 'out' }),
      // gift: 1
      item(4, 2),
      // correction: 1
      item(5, 3),
      // purchase: 1 bonus (counts as bonusIn)
      item(6, 4, { itemKind: 'bonus' }),
    ]
    const counts = aggregateSideCounts(events, items)
    expect(counts.tradeIn).toBe(2)
    expect(counts.tradeOut).toBe(1)
    expect(counts.giftIn).toBe(1)
    expect(counts.correctionIn).toBe(1)
    expect(counts.bonusIn).toBe(1)
  })
})

describe('hitRatePerTemplate', () => {
  it('computes rate per productTemplateId', () => {
    const events: AcquisitionEvent[] = [
      purchase(1, 150, 7, 'pack_7'),
      purchase(2, 150, 7, 'pack_7'),
      purchase(3, 2400, 112, 'classic_tin'),
    ]
    const items = [
      // Pack 1: 5 new, 2 dup
      ...Array.from({ length: 5 }, (_, i) =>
        item(i + 1, 1, { stickerId: `GER-${i + 1}`, wasNew: true }),
      ),
      ...Array.from({ length: 2 }, (_, i) =>
        item(10 + i, 1, { stickerId: `GER-${i + 1}`, wasNew: false }),
      ),
      // Pack 2: 7 new
      ...Array.from({ length: 7 }, (_, i) =>
        item(20 + i, 2, { stickerId: `FRA-${i + 1}`, wasNew: true }),
      ),
      // Classic Tin: 100 new, 12 dup
      ...Array.from({ length: 100 }, (_, i) =>
        item(30 + i, 3, { stickerId: `BRA-${i + 1}`, wasNew: true }),
      ),
      ...Array.from({ length: 12 }, (_, i) =>
        item(200 + i, 3, { stickerId: `BRA-${i + 1}`, wasNew: false }),
      ),
    ]
    const rows = hitRatePerTemplate(events, items)
    const pack = rows.find((r) => r.productTemplateId === 'pack_7')!
    const tin = rows.find((r) => r.productTemplateId === 'classic_tin')!
    expect(pack.purchases).toBe(2)
    expect(pack.opened).toBe(14)
    expect(pack.newOnes).toBe(12) // 5 + 7
    expect(pack.rate).toBeCloseTo(12 / 14, 4)
    expect(tin.purchases).toBe(1)
    expect(tin.opened).toBe(112)
    expect(tin.newOnes).toBe(100)
  })
})
