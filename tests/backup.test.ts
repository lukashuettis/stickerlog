import { beforeEach, describe, expect, it } from 'vitest'
import { db, createEvent, recomputeAllCaches } from '@/lib/db'
import {
  BackupSchemaV1,
  BackupSchemaV2,
  createBackup,
  importBackup,
} from '@/lib/backup'

async function reset() {
  await db.transaction('rw', [db.events, db.items, db.collectionCache, db.settings], async () => {
    await db.events.clear()
    await db.items.clear()
    await db.collectionCache.clear()
    await db.settings.clear()
  })
}

async function seedSample() {
  // Two purchases, one trade event, with a mix of new + duplicate items.
  await createEvent(
    {
      type: 'purchase',
      productTemplateId: 'pack_7',
      store: 'Lidl',
      priceCents: 125,
      expectedPaidStickerCount: 7,
      occurredAt: '2026-05-01T12:00:00.000Z',
    },
    [
      { stickerCatalog: 'album', stickerId: 'GER-1', itemKind: 'album' },
      { stickerCatalog: 'album', stickerId: 'GER-2', itemKind: 'album' },
      { stickerCatalog: 'album', stickerId: 'FRA-1', itemKind: 'album' },
    ],
  )
  await createEvent(
    {
      type: 'purchase',
      productTemplateId: 'pack_7',
      store: 'Edeka',
      priceCents: 150,
      expectedPaidStickerCount: 7,
      occurredAt: '2026-05-02T12:00:00.000Z',
    },
    [
      // GER-1 is a duplicate of pack 1
      { stickerCatalog: 'album', stickerId: 'GER-1', itemKind: 'album' },
      { stickerCatalog: 'album', stickerId: 'BRA-7', itemKind: 'album' },
    ],
  )
}

describe('Backup round-trip', () => {
  beforeEach(async () => {
    await reset()
  })

  it('exports a v2-shaped backup that validates with BackupSchemaV2', async () => {
    await seedSample()
    const backup = await createBackup()
    expect(backup.schemaVersion).toBe(2)
    const parsed = BackupSchemaV2.safeParse(backup)
    expect(parsed.success).toBe(true)
    expect(backup.data.events).toHaveLength(2)
    expect(backup.data.items).toHaveLength(5)
    // Cache field is intentionally omitted from the export — items are truth.
    expect((backup.data as { album?: unknown }).album).toBeUndefined()
  })

  it('round-trips: export → wipe → import-replace → identical state', async () => {
    await seedSample()
    const before = await createBackup()

    // Serialise + parse like a real file would
    const json = JSON.stringify(before)
    const file = new File([json], 'backup.json', { type: 'application/json' })

    // Stub the safety-backup download (jsdom-less environment)
    globalThis.URL.createObjectURL ??= () => 'blob:test'
    globalThis.URL.revokeObjectURL ??= () => {}
    const origAdd = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = () => {}

    try {
      await importBackup(file, 'replace')
    } finally {
      HTMLAnchorElement.prototype.click = origAdd
    }

    const after = await createBackup()

    // Events & items match (modulo auto-incremented ids, which are preserved
    // on replace-mode imports, so we can compare directly).
    expect(after.data.events).toEqual(before.data.events)
    expect(after.data.items).toEqual(before.data.items)
  })

  it('rebuilds collectionCache from items after import', async () => {
    await seedSample()
    const cacheBefore = await db.collectionCache.toArray()

    await db.collectionCache.clear()
    expect(await db.collectionCache.count()).toBe(0)

    await recomputeAllCaches()

    const cacheAfter = await db.collectionCache.toArray()
    expect(cacheAfter.length).toBe(cacheBefore.length)

    // GER-1 should have count 2 (one new, one duplicate)
    const ger1 = cacheAfter.find((e) => e.stickerId === 'GER-1')
    expect(ger1?.count).toBe(2)
  })

  it('marks the second occurrence of a sticker as wasNew=false', async () => {
    await seedSample()
    const items = await db.items
      .where('[stickerCatalog+stickerId]')
      .equals(['album', 'GER-1'])
      .toArray()
    items.sort((a, b) => a.sequence - b.sequence)
    expect(items.length).toBe(2)
    expect(items[0].wasNew).toBe(true)
    expect(items[1].wasNew).toBe(false)
  })

  it('rejects invalid backup JSON', async () => {
    const bogus = new File(['{"hello":"world"}'], 'bad.json', { type: 'application/json' })
    globalThis.URL.createObjectURL ??= () => 'blob:test'
    HTMLAnchorElement.prototype.click = () => {}
    await expect(importBackup(bogus, 'replace')).rejects.toThrow(/ungültig|Format/i)
  })
})

describe('Backup v1 compatibility', () => {
  it('parses a legacy v1 backup shape', () => {
    const v1 = {
      schemaVersion: 1,
      data: {
        album: [
          { stickerId: 'GER-1', count: 1 },
          { stickerId: 'GER-2', count: 2 },
        ],
        packs: [
          {
            id: 1,
            store: 'Edeka',
            priceCents: 150,
            packSize: 7,
            purchasedAt: '2026-05-01',
          },
        ],
        packItems: [
          {
            id: 1,
            packId: 1,
            stickerId: 'GER-1',
            wasNewAtPurchase: true,
          },
        ],
      },
    }
    const parsed = BackupSchemaV1.safeParse(v1)
    expect(parsed.success).toBe(true)
  })
})
