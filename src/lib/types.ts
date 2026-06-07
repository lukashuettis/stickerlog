// ─── Catalog (static) ─────────────────────────────────────────────────────
// Album = 980 base slots. The other catalogs are for stickers that are NOT
// part of the 980-slot album (DFB Glitter from Tin, Coca-Cola promo, etc.).

export type StickerCatalog =
  | 'album'
  | 'dfb_special'
  | 'panini_extra'
  | 'cocacola'
  | 'custom'

// ─── Album master data ────────────────────────────────────────────────────

export type StickerType =
  | 'player'
  | 'badge'
  | 'team_photo'
  | 'intro'
  | 'fifa_museum'
  /** Coca-Cola-style promo sticker — outside the 980 base slots in the printed
   *  album, but the user collects them all the same. Never cost-bearing. */
  | 'promo'

export interface AlbumSlot {
  n: number
  id: string                   // "GER-1" etc.
  teamCode: string
  number: number
  type: StickerType
  playerName?: string
  position?: 'GK' | 'DEF' | 'MID' | 'FWD'
  hasFoil: boolean
}

export interface Team {
  code: string
  /** German display name (primary, used as fallback) */
  name: string
  /** English display name (optional — falls back to `name` if absent) */
  nameEn?: string
  group: string | null
  confederation: string
  flagColors: [string, string, string]
}

// Parallel borders, extras, and promos (Coca-Cola, DFB Glitter) are an
// explicit non-goal for v0.1 — they don't fill an album slot and would
// complicate the cost model. The plan documents the v0.2 schema.

// ─── Product templates (static, shipped with the app) ─────────────────────
// A template describes a sellable product (pouch, multipack, tin, box).
// `paidStickerCount` is what counts toward Hit-Rate and cost-allocation —
// bonus items (e.g. DFB Special in a Tin) are tracked separately.

export type BonusItemKind = 'dfb_special' | 'panini_extra' | 'cocacola' | 'other'

export interface BonusItemSpec {
  kind: BonusItemKind
  count: number
}

export interface ProductTemplate {
  id: string                       // 'pack_7', 'classic_tin', …
  /** Fallback display name (German). UI looks up `product.<id>` in i18n first. */
  name: string
  paidPacketCount: number          // 1, 4, 16, 100, …
  stickersPerPacket: number        // typically 7
  /** = paidPacketCount × stickersPerPacket — convenience */
  paidStickerCount: number
  bonusItems: BonusItemSpec[]
  /** Suggested price (overridable per purchase). Some templates have no
   *  static default and derive from the single-pouch price × packet count. */
  defaultPriceCents?: number
  /** True if pack contents are confirmed via official source; false means
   *  the user might need to adjust. Surfaced as a small hint in UI. */
  verified: boolean
}

// ─── Acquisition Events & Items (the truth source) ────────────────────────

export type AcquisitionEventType =
  | 'purchase'      // bought a product (pouch, multipack, tin, box)
  | 'trade'         // swapped with someone
  | 'gift'          // received as a gift
  | 'promo'         // promotional (Coca-Cola etc.)
  | 'correction'   // manual entry / inventory correction

export interface AcquisitionEvent {
  id?: number
  type: AcquisitionEventType
  /** ISO date string */
  occurredAt: string
  notes?: string

  // purchase-only fields
  productTemplateId?: string
  store?: string
  priceCents?: number
  /** How many regular album stickers this purchase is expected to contain.
   *  Used for cost-allocation per item. Stable across the event's life. */
  expectedPaidStickerCount?: number

  // trade-only
  tradePartner?: string

  // promo-only
  promoName?: string
}

export type ItemDirection = 'in' | 'out'

export type ItemKind =
  | 'album'
  | 'bonus'
  | 'dfb_special'
  | 'panini_extra'
  | 'cocacola'
  | 'promo'
  | 'correction'

export interface AcquisitionItem {
  id?: number
  eventId: number
  stickerCatalog: StickerCatalog
  stickerId: string
  direction: ItemDirection
  itemKind: ItemKind
  /** True iff at the chronological moment of acquisition the running
   *  collection count for this (catalog,id) was 0. Re-derived on changes. */
  wasNew: boolean
  /** ISO datetime — drives chronological order for wasNew computation */
  acquiredAt: string
  /** Monotonic tiebreaker for items with identical acquiredAt */
  sequence: number
  /** Optional context for box/multipack openings */
  packetIndex?: number
  notes?: string
  // NOTE: `countsTowardCost` is NOT stored. It is derived live in stats
  // from (event.type, item.direction, item.itemKind) to stay consistent.
}

// ─── Cached current state (rebuilt from events/items) ─────────────────────

export interface CollectionCacheEntry {
  stickerCatalog: StickerCatalog
  stickerId: string
  count: number
  firstAddedAt?: string
  lastUpdatedAt?: string
}

// ─── Settings ─────────────────────────────────────────────────────────────

export interface Setting {
  key: string
  value: unknown
}

// ─── Stats DTOs (used by views) ───────────────────────────────────────────

export interface AlbumStats {
  ownedCount: number
  totalCount: number
  duplicateCount: number
  completionPct: number
}

export interface CostStats {
  totalSpentCents: number
  purchaseCount: number
  openedRegularPaid: number
  newRegularPaid: number
  allocatedOpenedCents: number
  costPerOpenedCents: number
  costPerNewCents: number
  hitRate: number // 0-1
}
