import Dexie, { type Table } from 'dexie'
import type {
  AcquisitionEvent,
  AcquisitionItem,
  CollectionCacheEntry,
  Setting,
  StickerCatalog,
  ItemKind,
  AcquisitionEventType,
} from './types'

/**
 * IndexedDB schema. Version history:
 *   v1: album/variants/promos/packs/packItems/settings (counts as cache)
 *   v2: events + items as truth, collectionCache as derived cache.
 *
 * Truth source: `events` + `items`.
 * Derived caches (rebuilt from events/items): `collectionCache`.
 */
export class StickerTrackerDB extends Dexie {
  // v2 stores (current)
  events!: Table<AcquisitionEvent, number>
  items!: Table<AcquisitionItem, number>
  collectionCache!: Table<CollectionCacheEntry, [StickerCatalog, string]>
  settings!: Table<Setting, string>

  // Legacy v1 stores (read-only during migration)
  album!: Table<LegacyAlbumEntry, string>
  packs!: Table<LegacyPack, number>
  packItems!: Table<LegacyPackItem, number>

  constructor() {
    super('StickerTracker26')

    // ─── v1 schema (kept so existing users don't lose data) ───────────────
    this.version(1).stores({
      album: 'stickerId, count, firstAddedAt',
      variants: '[stickerId+variantId], stickerId, variantId',
      promos: 'promoStickerId, count',
      packs: '++id, purchasedAt, store',
      packItems: '++id, packId, stickerId',
      settings: 'key',
    })

    // ─── v2 schema ────────────────────────────────────────────────────────
    // New stores: events, items, collectionCache.
    // Migration runs in the upgrade callback below.
    this.version(2)
      .stores({
        events: '++id, occurredAt, type, productTemplateId',
        items: '++id, eventId, [stickerCatalog+stickerId], stickerCatalog, stickerId, [acquiredAt+sequence], sequence',
        collectionCache: '[stickerCatalog+stickerId], stickerCatalog, count',
        // Keep legacy tables around as a safety net for one version; drop in v3.
        album: 'stickerId, count, firstAddedAt',
        packs: '++id, purchasedAt, store',
        packItems: '++id, packId, stickerId',
        settings: 'key',
      })
      .upgrade(async (tx) => {
        // Pull all legacy data inside the transaction
        const oldPacks: LegacyPack[] = await tx.table('packs').toArray()
        const oldPackItems: LegacyPackItem[] = await tx.table('packItems').toArray()
        const oldAlbum: LegacyAlbumEntry[] = await tx.table('album').toArray()

        const eventsTbl = tx.table<AcquisitionEvent, number>('events')
        const itemsTbl = tx.table<AcquisitionItem, number>('items')

        // 1. Map each legacy pack → AcquisitionEvent (purchase)
        const oldPackIdToNewEventId = new Map<number, number>()
        for (const p of oldPacks) {
          const eventId = (await eventsTbl.add({
            type: 'purchase',
            productTemplateId: 'pack_7',
            store: p.store,
            priceCents: p.priceCents,
            expectedPaidStickerCount: p.packSize || 7,
            occurredAt: p.purchasedAt,
            notes: p.notes,
          })) as number
          if (p.id !== undefined) oldPackIdToNewEventId.set(p.id, eventId)
        }

        // 2. Each PackItem → AcquisitionItem ('album' kind, 'in' direction)
        let seq = Date.now()
        const stickersInPackItems = new Set<string>()
        for (const pi of oldPackItems) {
          const eventId = oldPackIdToNewEventId.get(pi.packId)
          if (!eventId) continue
          await itemsTbl.add({
            eventId,
            stickerCatalog: 'album',
            stickerId: pi.stickerId,
            direction: 'in',
            itemKind: 'album',
            wasNew: pi.wasNewAtPurchase ?? true,
            acquiredAt: (oldPacks.find((p) => p.id === pi.packId)?.purchasedAt) || new Date().toISOString(),
            sequence: ++seq,
          })
          stickersInPackItems.add(pi.stickerId)
        }

        // 3. Album entries NOT covered by pack items → 1 correction event with N items
        const orphanEntries = oldAlbum.filter((e) => !stickersInPackItems.has(e.stickerId) && e.count > 0)
        if (orphanEntries.length > 0) {
          const correctionEventId = (await eventsTbl.add({
            type: 'correction',
            occurredAt: orphanEntries[0].firstAddedAt ?? new Date().toISOString(),
            notes: 'Migration v1→v2: vorhandene Sammlung übernommen',
          })) as number

          for (const e of orphanEntries) {
            for (let i = 0; i < e.count; i++) {
              await itemsTbl.add({
                eventId: correctionEventId,
                stickerCatalog: 'album',
                stickerId: e.stickerId,
                direction: 'in',
                itemKind: 'album',
                wasNew: i === 0,
                acquiredAt: e.firstAddedAt ?? new Date().toISOString(),
                sequence: ++seq,
              })
            }
          }
        }
        // collectionCache will be rebuilt after the upgrade closes — done in
        // a follow-up call in the app bootstrap.
      })
  }
}

// ─── Legacy v1 types kept here for the migration only ─────────────────────

interface LegacyAlbumEntry {
  stickerId: string
  count: number
  firstAddedAt?: string
  lastUpdatedAt?: string
}
interface LegacyPack {
  id?: number
  store: string
  priceCents: number
  packSize: number
  purchasedAt: string
  notes?: string
}
interface LegacyPackItem {
  id?: number
  packId: number
  stickerId: string
  stickerType?: string
  wasNewAtPurchase: boolean
}

export const db = new StickerTrackerDB()

// ─── Recompute caches & wasNew flags ──────────────────────────────────────
// Single source of truth: the chronological item stream. Whenever events or
// items change, this rebuilds derived state so it can't drift.

const keyOf = (catalog: StickerCatalog, id: string) => `${catalog}:${id}`

export async function recomputeAllCaches(): Promise<void> {
  const items = await db.items.orderBy('[acquiredAt+sequence]').toArray()

  const counts = new Map<string, number>()
  const firstSeenAt = new Map<string, string>()
  const lastUpdatedAt = new Map<string, string>()
  const wasNewUpdates: Array<{ id: number; wasNew: boolean }> = []

  for (const item of items) {
    const k = keyOf(item.stickerCatalog, item.stickerId)
    const prev = counts.get(k) ?? 0
    if (item.direction === 'in') {
      const shouldBeNew = prev === 0
      if (item.wasNew !== shouldBeNew && item.id !== undefined) {
        wasNewUpdates.push({ id: item.id, wasNew: shouldBeNew })
      }
      counts.set(k, prev + 1)
      if (!firstSeenAt.has(k)) firstSeenAt.set(k, item.acquiredAt)
      lastUpdatedAt.set(k, item.acquiredAt)
    } else {
      counts.set(k, Math.max(0, prev - 1))
      lastUpdatedAt.set(k, item.acquiredAt)
    }
  }

  // Apply wasNew updates + rebuild collectionCache in one transaction
  await db.transaction('rw', [db.items, db.collectionCache], async () => {
    for (const u of wasNewUpdates) {
      await db.items.update(u.id, { wasNew: u.wasNew })
    }
    await db.collectionCache.clear()
    const entries: CollectionCacheEntry[] = []
    for (const [k, count] of counts) {
      if (count <= 0) continue
      const [catalog, id] = k.split(':', 2) as [StickerCatalog, string]
      entries.push({
        stickerCatalog: catalog,
        stickerId: id,
        count,
        firstAddedAt: firstSeenAt.get(k),
        lastUpdatedAt: lastUpdatedAt.get(k),
      })
    }
    if (entries.length) await db.collectionCache.bulkAdd(entries)
  })
}

// ─── High-level commands ──────────────────────────────────────────────────
// Components shouldn't add events/items raw — they go through these helpers
// so recomputeAllCaches() runs deterministically afterwards.

interface NewItem {
  stickerCatalog: StickerCatalog
  stickerId: string
  itemKind: ItemKind
  direction?: ItemDirection
  notes?: string
  packetIndex?: number
}
type ItemDirection = 'in' | 'out'

/** Create a new event with N items. Items default to direction='in'. */
export async function createEvent(
  event: Omit<AcquisitionEvent, 'id'>,
  items: NewItem[],
): Promise<number> {
  const eventId = await db.transaction('rw', [db.events, db.items], async () => {
    const id = (await db.events.add(event as AcquisitionEvent)) as number
    let seq = Date.now()
    for (const it of items) {
      await db.items.add({
        eventId: id,
        stickerCatalog: it.stickerCatalog,
        stickerId: it.stickerId,
        direction: it.direction ?? 'in',
        itemKind: it.itemKind,
        wasNew: true, // placeholder, recompute will fix
        acquiredAt: event.occurredAt,
        sequence: ++seq,
        packetIndex: it.packetIndex,
        notes: it.notes,
      })
    }
    return id
  })
  await recomputeAllCaches()
  return eventId
}

/** Add additional items to an existing event (e.g. opening another pouch from a Box). */
export async function appendItemsToEvent(eventId: number, items: NewItem[]): Promise<void> {
  const event = await db.events.get(eventId)
  if (!event) throw new Error(`Event ${eventId} not found`)
  await db.transaction('rw', [db.items], async () => {
    let seq = Date.now()
    for (const it of items) {
      await db.items.add({
        eventId,
        stickerCatalog: it.stickerCatalog,
        stickerId: it.stickerId,
        direction: it.direction ?? 'in',
        itemKind: it.itemKind,
        wasNew: true,
        acquiredAt: new Date().toISOString(),
        sequence: ++seq,
        packetIndex: it.packetIndex,
        notes: it.notes,
      })
    }
  })
  await recomputeAllCaches()
}

export async function deleteEvent(eventId: number): Promise<void> {
  await db.transaction('rw', [db.events, db.items], async () => {
    await db.items.where('eventId').equals(eventId).delete()
    await db.events.delete(eventId)
  })
  await recomputeAllCaches()
}

/** Patch event-level metadata (store, price, date, notes). Item rows are
 *  untouched — for editing actual sticker contents, use the item-level
 *  helpers below. */
export async function updateEventMeta(
  eventId: number,
  patch: Partial<
    Pick<
      AcquisitionEvent,
      'store' | 'priceCents' | 'occurredAt' | 'notes' | 'productTemplateId' | 'expectedPaidStickerCount'
    >
  >,
): Promise<void> {
  await db.events.update(eventId, patch)
  await recomputeAllCaches()
}

export async function deleteItem(itemId: number): Promise<void> {
  await db.items.delete(itemId)
  await recomputeAllCaches()
}

export async function updateItemKind(itemId: number, itemKind: ItemKind): Promise<void> {
  await db.items.update(itemId, { itemKind })
  // wasNew might be unaffected, but cache may still change (e.g. album↔bonus)
  await recomputeAllCaches()
}

// ─── Quick adjustments from the team grid (correction events) ─────────────

export async function addOneCorrection(
  stickerCatalog: StickerCatalog,
  stickerId: string,
): Promise<void> {
  const now = new Date().toISOString()
  await createEvent(
    {
      type: 'correction',
      occurredAt: now,
      notes: 'Manuelle Korrektur via Album-Übersicht',
    },
    [{ stickerCatalog, stickerId, itemKind: 'album' }],
  )
}

export async function removeOneCorrection(
  stickerCatalog: StickerCatalog,
  stickerId: string,
): Promise<void> {
  const now = new Date().toISOString()
  await createEvent(
    {
      type: 'correction',
      occurredAt: now,
      notes: 'Sticker entfernt via Album-Übersicht',
    },
    [{ stickerCatalog, stickerId, itemKind: 'album', direction: 'out' }],
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────

export async function getSetting<T = unknown>(key: string, fallback?: T): Promise<T | undefined> {
  const row = await db.settings.get(key)
  return (row?.value as T | undefined) ?? fallback
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}

// ─── Reset ────────────────────────────────────────────────────────────────

export async function wipeAllUserData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.events, db.items, db.collectionCache, db.settings, db.album, db.packs, db.packItems],
    async () => {
      await db.events.clear()
      await db.items.clear()
      await db.collectionCache.clear()
      await db.settings.clear()
      await db.album.clear()
      await db.packs.clear()
      await db.packItems.clear()
    },
  )
}

// ─── Re-export AcquisitionEventType for convenience ───────────────────────
export type { AcquisitionEventType }
