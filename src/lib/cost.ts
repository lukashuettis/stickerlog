import type { AcquisitionEvent, AcquisitionItem, CostStats } from './types'

/**
 * Cost-bearing rule (derived, never stored):
 *   countsTowardCost = event.type === 'purchase'
 *                   AND item.direction === 'in'
 *                   AND item.itemKind === 'album'
 *                   AND NOT a CC bonus promo (those don't come from paid packs)
 *
 * Anything else (bonus, dfb_special, panini_extra, cocacola, trade, gift,
 * promo, correction) does NOT count in cost-per-sticker / hit-rate. The
 * explicit CC prefix guard defends against a user accidentally typing a
 * CC code in the pack-open textarea — that would otherwise pollute the
 * cost-per-new-sticker calculation.
 */
export function isCostBearing(item: AcquisitionItem, event: AcquisitionEvent): boolean {
  return (
    event.type === 'purchase' &&
    item.direction === 'in' &&
    item.itemKind === 'album' &&
    !item.stickerId.startsWith('CC-')
  )
}

/**
 * Allocated cost (cents) per item for a purchase event:
 *   = event.priceCents / event.expectedPaidStickerCount
 *
 * Returns 0 for events that don't define both fields (e.g. tin without
 * a price entered yet). Returns 0 for non-purchase events.
 */
export function allocatedCostPerItem(event: AcquisitionEvent): number {
  if (event.type !== 'purchase') return 0
  if (!event.priceCents || !event.expectedPaidStickerCount) return 0
  return event.priceCents / event.expectedPaidStickerCount
}

/**
 * Aggregate cost stats across all events + items.
 *
 * Formula (per user spec):
 *   totalSpent          = sum(event.priceCents) for purchase events
 *   allocatedOpenedCost = sum(allocatedCostPerItem(event)) for cost-bearing items
 *   openedRegularPaid   = count(cost-bearing items)
 *   newRegularPaid      = count(cost-bearing items where wasNew)
 *   costPerOpened       = allocatedOpenedCost / openedRegularPaid
 *   costPerNew          = allocatedOpenedCost / newRegularPaid  ← duplicates still cost
 *   hitRate             = newRegularPaid / openedRegularPaid
 */
export function aggregateCostStats(
  events: AcquisitionEvent[],
  items: AcquisitionItem[],
): CostStats {
  const eventById = new Map<number, AcquisitionEvent>()
  for (const e of events) {
    if (e.id !== undefined) eventById.set(e.id, e)
  }

  let totalSpentCents = 0
  let purchaseCount = 0
  for (const e of events) {
    if (e.type === 'purchase') {
      totalSpentCents += e.priceCents ?? 0
      purchaseCount++
    }
  }

  let allocatedOpenedCents = 0
  let openedRegularPaid = 0
  let newRegularPaid = 0

  for (const item of items) {
    const event = eventById.get(item.eventId)
    if (!event) continue
    if (!isCostBearing(item, event)) continue
    openedRegularPaid++
    if (item.wasNew) newRegularPaid++
    allocatedOpenedCents += allocatedCostPerItem(event)
  }

  const costPerOpenedCents = openedRegularPaid
    ? allocatedOpenedCents / openedRegularPaid
    : 0
  const costPerNewCents = newRegularPaid
    ? allocatedOpenedCents / newRegularPaid
    : 0
  const hitRate = openedRegularPaid ? newRegularPaid / openedRegularPaid : 0

  return {
    totalSpentCents,
    purchaseCount,
    openedRegularPaid,
    newRegularPaid,
    allocatedOpenedCents,
    costPerOpenedCents,
    costPerNewCents,
    hitRate,
  }
}

// ─── Side stats (not cost-bearing, info only) ─────────────────────────────

export interface SideCounts {
  tradeIn: number
  tradeOut: number
  giftIn: number
  promoIn: number
  correctionIn: number
  bonusIn: number
}

export function aggregateSideCounts(
  events: AcquisitionEvent[],
  items: AcquisitionItem[],
): SideCounts {
  const eventById = new Map<number, AcquisitionEvent>()
  for (const e of events) {
    if (e.id !== undefined) eventById.set(e.id, e)
  }
  const c: SideCounts = {
    tradeIn: 0,
    tradeOut: 0,
    giftIn: 0,
    promoIn: 0,
    correctionIn: 0,
    bonusIn: 0,
  }
  for (const item of items) {
    const ev = eventById.get(item.eventId)
    if (!ev) continue
    if (ev.type === 'trade') {
      if (item.direction === 'in') c.tradeIn++
      else c.tradeOut++
    } else if (ev.type === 'gift' && item.direction === 'in') {
      c.giftIn++
    } else if (ev.type === 'promo' && item.direction === 'in') {
      c.promoIn++
    } else if (ev.type === 'correction' && item.direction === 'in') {
      c.correctionIn++
    } else if (
      ev.type === 'purchase' &&
      item.direction === 'in' &&
      item.itemKind !== 'album'
    ) {
      c.bonusIn++
    }
  }
  return c
}

// ─── Per-template hit-rate (for advanced stats / details) ─────────────────

export interface TemplateHitRate {
  productTemplateId: string
  purchases: number
  opened: number
  newOnes: number
  rate: number
}

export function hitRatePerTemplate(
  events: AcquisitionEvent[],
  items: AcquisitionItem[],
): TemplateHitRate[] {
  const byTpl: Record<string, { purchases: number; opened: number; newOnes: number }> = {}
  const eventById = new Map<number, AcquisitionEvent>()
  for (const e of events) {
    if (e.id !== undefined) eventById.set(e.id, e)
    if (e.type === 'purchase' && e.productTemplateId) {
      if (!byTpl[e.productTemplateId])
        byTpl[e.productTemplateId] = { purchases: 0, opened: 0, newOnes: 0 }
      byTpl[e.productTemplateId].purchases++
    }
  }
  for (const item of items) {
    const e = eventById.get(item.eventId)
    if (!e || !e.productTemplateId) continue
    if (!isCostBearing(item, e)) continue
    const slot = byTpl[e.productTemplateId]
    if (!slot) continue
    slot.opened++
    if (item.wasNew) slot.newOnes++
  }
  return Object.entries(byTpl)
    .map(([id, v]) => ({
      productTemplateId: id,
      purchases: v.purchases,
      opened: v.opened,
      newOnes: v.newOnes,
      rate: v.opened ? v.newOnes / v.opened : 0,
    }))
    .sort((a, b) => b.opened - a.opened)
}
