import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { computeAlbumStats } from '@/lib/stats'
import { aggregateCostStats } from '@/lib/cost'
import type { StickerCatalog } from '@/lib/types'

/** Live collection cache for album stickers. */
export function useAlbumCache() {
  return useLiveQuery(
    () => db.collectionCache.where('stickerCatalog').equals('album').toArray(),
    [],
    [],
  )
}

/** Map of stickerId → count for fast lookup. */
export function useOwnedMap(catalog: StickerCatalog = 'album') {
  const entries =
    useLiveQuery(
      () => db.collectionCache.where('stickerCatalog').equals(catalog).toArray(),
      [catalog],
      [],
    ) ?? []
  const map: Record<string, number> = {}
  for (const e of entries) map[e.stickerId] = e.count
  return map
}

export function useAlbumStats() {
  const entries = useAlbumCache() ?? []
  return computeAlbumStats(entries)
}

export function useEvents() {
  return useLiveQuery(
    () => db.events.orderBy('occurredAt').reverse().toArray(),
    [],
    [],
  )
}

export function useItems() {
  return useLiveQuery(() => db.items.toArray(), [], [])
}

export function useItemsForSticker(catalog: StickerCatalog, stickerId: string) {
  return useLiveQuery(
    () =>
      db.items
        .where('[stickerCatalog+stickerId]')
        .equals([catalog, stickerId])
        .toArray(),
    [catalog, stickerId],
    [],
  )
}

export function useCostStats() {
  const events = useEvents() ?? []
  const items = useItems() ?? []
  return aggregateCostStats(events, items)
}

export function useSetting<T = unknown>(key: string, fallback?: T): T | undefined {
  const row = useLiveQuery(() => db.settings.get(key), [key])
  return (row?.value as T | undefined) ?? fallback
}
