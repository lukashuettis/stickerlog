import { z } from 'zod'
import type {
  AcquisitionEvent,
  AcquisitionItem,
  Setting,
} from './types'
import { db, recomputeAllCaches, setSetting } from './db'

// ─── Schemas ──────────────────────────────────────────────────────────────

const StickerCatalogSchema = z.enum([
  'album',
  'dfb_special',
  'panini_extra',
  'cocacola',
  'custom',
])

const EventTypeSchema = z.enum(['purchase', 'trade', 'gift', 'promo', 'correction'])
const DirectionSchema = z.enum(['in', 'out'])
const ItemKindSchema = z.enum([
  'album',
  'bonus',
  'dfb_special',
  'panini_extra',
  'cocacola',
  'promo',
  'correction',
])

const EventSchema: z.ZodType<AcquisitionEvent> = z.object({
  id: z.number().int().optional(),
  type: EventTypeSchema,
  occurredAt: z.string(),
  notes: z.string().optional(),
  productTemplateId: z.string().optional(),
  store: z.string().optional(),
  priceCents: z.number().int().min(0).optional(),
  expectedPaidStickerCount: z.number().int().min(0).optional(),
  tradePartner: z.string().optional(),
  promoName: z.string().optional(),
})

const ItemSchema: z.ZodType<AcquisitionItem> = z.object({
  id: z.number().int().optional(),
  eventId: z.number().int(),
  stickerCatalog: StickerCatalogSchema,
  stickerId: z.string().min(1),
  direction: DirectionSchema,
  itemKind: ItemKindSchema,
  wasNew: z.boolean(),
  acquiredAt: z.string(),
  sequence: z.number().int(),
  packetIndex: z.number().int().optional(),
  notes: z.string().optional(),
})

const SettingSchema: z.ZodType<Setting> = z.object({
  key: z.string(),
  value: z.unknown(),
})

// v2 format
export const BackupSchemaV2 = z.object({
  schemaVersion: z.literal(2),
  appVersion: z.string(),
  exportedAt: z.string(),
  data: z.object({
    events: z.array(EventSchema),
    items: z.array(ItemSchema),
    settings: z.array(SettingSchema),
    // album cache is intentionally OPTIONAL on import — recomputed from items
    album: z.array(z.unknown()).optional(),
  }),
})

// v1 fallback format (for old backups)
const LegacyAlbumEntrySchema = z.object({
  stickerId: z.string(),
  count: z.number().int().min(0),
  firstAddedAt: z.string().optional(),
  lastUpdatedAt: z.string().optional(),
})
const LegacyPackSchema = z.object({
  id: z.number().int().optional(),
  store: z.string(),
  priceCents: z.number().int().min(0),
  packSize: z.number().int().min(1),
  purchasedAt: z.string(),
  notes: z.string().optional(),
})
const LegacyPackItemSchema = z.object({
  id: z.number().int().optional(),
  packId: z.number().int(),
  stickerId: z.string(),
  stickerType: z.string().optional(),
  variantId: z.string().optional(),
  wasNewAtPurchase: z.boolean(),
})
export const BackupSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  appVersion: z.string().optional(),
  exportedAt: z.string().optional(),
  data: z.object({
    album: z.array(LegacyAlbumEntrySchema),
    variants: z.array(z.unknown()).optional(),
    promos: z.array(z.unknown()).optional(),
    packs: z.array(LegacyPackSchema),
    packItems: z.array(LegacyPackItemSchema),
    settings: z.array(SettingSchema).optional(),
  }),
})

export type BackupV2 = z.infer<typeof BackupSchemaV2>
export type BackupV1 = z.infer<typeof BackupSchemaV1>

// Keep in sync with package.json "version".
const APP_VERSION = '0.1.1'

// ─── Export ───────────────────────────────────────────────────────────────

export async function createBackup(): Promise<BackupV2> {
  const [events, items, settings] = await Promise.all([
    db.events.toArray(),
    db.items.toArray(),
    db.settings.toArray(),
  ])
  return {
    schemaVersion: 2,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { events, items, settings },
  }
}

export async function downloadBackup(filename?: string): Promise<void> {
  const backup = await createBackup()
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? defaultBackupFilename()
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  await setSetting('lastBackupAt', new Date().toISOString())
}

function defaultBackupFilename(): string {
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `sticker-tracker-backup-${ts}.json`
}

// ─── Import ───────────────────────────────────────────────────────────────

export type ImportMode = 'replace' | 'merge'

export async function importBackup(file: File, mode: ImportMode): Promise<void> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Datei ist kein gültiges JSON.')
  }

  // Always do a safety backup first
  await downloadBackup(`pre-import-safety-${Date.now()}.json`)

  // Try v2, fall back to v1
  const v2 = BackupSchemaV2.safeParse(parsed)
  if (v2.success) {
    return applyV2(v2.data, mode)
  }
  const v1 = BackupSchemaV1.safeParse(parsed)
  if (v1.success) {
    return applyV1Migration(v1.data, mode)
  }

  // Both failed — pick the more informative error message
  const issues = [
    ...(v2.success ? [] : v2.error.issues.slice(0, 3).map((i) => i.message)),
  ]
  throw new Error(
    `Backup-Datei ungültig: ${issues.join('; ') || 'Format nicht erkannt'}`,
  )
}

async function applyV2(backup: BackupV2, mode: ImportMode): Promise<void> {
  if (mode === 'replace') {
    await db.transaction(
      'rw',
      [db.events, db.items, db.collectionCache, db.settings],
      async () => {
        await db.events.clear()
        await db.items.clear()
        await db.collectionCache.clear()
        await db.settings.clear()
        if (backup.data.events.length) await db.events.bulkAdd(backup.data.events)
        if (backup.data.items.length) await db.items.bulkAdd(backup.data.items)
        if (backup.data.settings.length) await db.settings.bulkPut(backup.data.settings)
      },
    )
  } else {
    // Merge mode: append events & items, settings fill gaps only.
    // We deliberately DO NOT try to deduplicate events — auto-IDs make that
    // unsafe. Merge is for adding a separate device's collection, replace is
    // for restoring on a clean install.
    await db.transaction('rw', [db.events, db.items, db.settings], async () => {
      // Strip ids so bulkAdd assigns fresh ones; remap eventId references.
      const idMap = new Map<number, number>()
      for (const ev of backup.data.events) {
        const oldId = ev.id
        const { id: _ignored, ...rest } = ev
        void _ignored
        const newId = (await db.events.add(rest as AcquisitionEvent)) as number
        if (oldId !== undefined) idMap.set(oldId, newId)
      }
      for (const it of backup.data.items) {
        const newEventId = idMap.get(it.eventId)
        if (newEventId === undefined) continue
        const { id: _ignored, ...rest } = it
        void _ignored
        await db.items.add({ ...rest, eventId: newEventId } as AcquisitionItem)
      }
      for (const s of backup.data.settings) {
        const existing = await db.settings.get(s.key)
        if (!existing) await db.settings.put(s)
      }
    })
  }
  // album[] from backup is intentionally ignored — items are the truth.
  await recomputeAllCaches()
}

async function applyV1Migration(backup: BackupV1, mode: ImportMode): Promise<void> {
  // Convert old packs+packItems+album into v2 events+items, then apply.
  const events: AcquisitionEvent[] = []
  const items: AcquisitionItem[] = []
  const oldToNewId = new Map<number, number>()
  let nextEventId = 1
  let nextItemId = 1
  let seq = Date.now()

  for (const p of backup.data.packs) {
    const newId = nextEventId++
    if (p.id !== undefined) oldToNewId.set(p.id, newId)
    events.push({
      id: newId,
      type: 'purchase',
      productTemplateId: 'pack_7',
      store: p.store,
      priceCents: p.priceCents,
      expectedPaidStickerCount: p.packSize || 7,
      occurredAt: p.purchasedAt,
      notes: p.notes,
    })
  }

  const stickersInPacks = new Set<string>()
  for (const pi of backup.data.packItems) {
    const ev = oldToNewId.get(pi.packId)
    if (!ev) continue
    items.push({
      id: nextItemId++,
      eventId: ev,
      stickerCatalog: 'album',
      stickerId: pi.stickerId,
      direction: 'in',
      itemKind: 'album',
      wasNew: pi.wasNewAtPurchase,
      acquiredAt:
        backup.data.packs.find((p) => p.id === pi.packId)?.purchasedAt ??
        new Date().toISOString(),
      sequence: ++seq,
    })
    stickersInPacks.add(pi.stickerId)
  }

  // Album entries not represented in pack items → one correction event with N items
  const orphan = backup.data.album.filter(
    (a) => !stickersInPacks.has(a.stickerId) && a.count > 0,
  )
  if (orphan.length > 0) {
    // eslint-disable-next-line no-useless-assignment
    const correctionId = nextEventId++
    events.push({
      id: correctionId,
      type: 'correction',
      occurredAt: orphan[0]?.firstAddedAt ?? new Date().toISOString(),
      notes: 'Backup-Import: bestehende Sammlung übernommen',
    })
    for (const a of orphan) {
      for (let i = 0; i < a.count; i++) {
        items.push({
          id: nextItemId++,
          eventId: correctionId,
          stickerCatalog: 'album',
          stickerId: a.stickerId,
          direction: 'in',
          itemKind: 'album',
          wasNew: i === 0,
          acquiredAt: a.firstAddedAt ?? new Date().toISOString(),
          sequence: ++seq,
        })
      }
    }
  }

  const synthBackup: BackupV2 = {
    schemaVersion: 2,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { events, items, settings: backup.data.settings ?? [] },
  }
  await applyV2(synthBackup, mode)
}
