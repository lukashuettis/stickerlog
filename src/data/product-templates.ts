import type { ProductTemplate } from '@/lib/types'

// Product templates describe sellable Panini products. Quantities are based on
// publicly available descriptions; the `verified` flag distinguishes
// confirmed-from-Panini packaging from "best guess" entries. Users can always
// override pack size and price at purchase time.

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    id: 'pack_7',
    name: 'Päckchen',
    paidPacketCount: 1,
    stickersPerPacket: 7,
    paidStickerCount: 7,
    bonusItems: [],
    // No defaultPrice — picked per-store at runtime (Lidl 1,25 € · Rewe 1,00 € · sonst 1,50 €)
    verified: true,
  },
  {
    id: 'multipack_4',
    name: 'Multipack 4er',
    paidPacketCount: 4,
    stickersPerPacket: 7,
    paidStickerCount: 28,
    bonusItems: [],
    verified: false,
  },
  {
    id: 'multipack_5',
    name: 'Multipack 5er',
    paidPacketCount: 5,
    stickersPerPacket: 7,
    paidStickerCount: 35,
    bonusItems: [],
    verified: false,
  },
  {
    id: 'eco_blister_6',
    name: 'Eco Blister 6er',
    paidPacketCount: 6,
    stickersPerPacket: 7,
    paidStickerCount: 42,
    bonusItems: [],
    verified: false,
  },
  {
    id: 'box_50',
    name: 'Box 50 Päckchen',
    paidPacketCount: 50,
    stickersPerPacket: 7,
    paidStickerCount: 350,
    bonusItems: [],
    verified: false,
  },
  {
    id: 'box_100',
    name: 'Box 100 Päckchen',
    paidPacketCount: 100,
    stickersPerPacket: 7,
    paidStickerCount: 700,
    bonusItems: [],
    defaultPriceCents: 15000,
    verified: true,
  },
  {
    id: 'pocket_tin',
    name: 'Pocket Tin',
    paidPacketCount: 8,
    stickersPerPacket: 7,
    paidStickerCount: 56,
    bonusItems: [{ kind: 'dfb_special', count: 1 }],
    verified: true,
  },
  {
    id: 'classic_tin',
    name: 'Classic Tin',
    paidPacketCount: 16,
    stickersPerPacket: 7,
    paidStickerCount: 112,
    bonusItems: [{ kind: 'dfb_special', count: 2 }],
    defaultPriceCents: 2400,
    verified: true,
  },
  {
    id: 'big_collector_box',
    name: "Big Collector's Box",
    paidPacketCount: 143,
    stickersPerPacket: 7,
    paidStickerCount: 1001,
    bonusItems: [{ kind: 'panini_extra', count: 3 }],
    verified: false,
  },
  {
    id: 'custom',
    name: 'Anderes Produkt',
    paidPacketCount: 0,
    stickersPerPacket: 7,
    paidStickerCount: 0,
    bonusItems: [],
    verified: true,
  },
]

export function getProductTemplate(id: string): ProductTemplate | undefined {
  return PRODUCT_TEMPLATES.find((t) => t.id === id)
}

/** The i18n key for a template's display name, e.g. "product.pack_7". */
export function productNameKey(id: string): `product.${string}` {
  return `product.${id}`
}

// ─── Price defaults ───────────────────────────────────────────────────────
// Lidl + Rewe currently run promo prices for the standard pouch. Treated as
// presets, NOT eternal truth: any field is editable per purchase.

const POUCH_PRICE_BY_STORE: Record<string, number> = {
  Lidl: 125,
  Rewe: 100,
  Edeka: 150,
  Online: 150,
  Anderer: 150,
}

/** Suggest a price (cents) for a given product template + store. */
export function suggestPriceCents(templateId: string, store: string): number | undefined {
  const tpl = getProductTemplate(templateId)
  if (!tpl) return undefined
  // Use template's static default first if present (Box 100, Classic Tin, …)
  if (tpl.defaultPriceCents !== undefined) return tpl.defaultPriceCents
  // Otherwise derive from pouch price × packet count
  const pouchPrice = POUCH_PRICE_BY_STORE[store] ?? POUCH_PRICE_BY_STORE.Edeka
  if (tpl.paidPacketCount > 0) {
    return pouchPrice * tpl.paidPacketCount
  }
  return undefined
}

export const STORE_OPTIONS = ['Edeka', 'Rewe', 'Lidl', 'Online', 'Anderer']
