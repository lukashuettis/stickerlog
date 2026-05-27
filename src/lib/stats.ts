import type { AlbumStats, CollectionCacheEntry } from './types'

export const ALBUM_TOTAL = 980

export function computeAlbumStats(entries: CollectionCacheEntry[]): AlbumStats {
  const albumEntries = entries.filter((e) => e.stickerCatalog === 'album')
  const ownedCount = albumEntries.length
  const duplicateCount = albumEntries.reduce((sum, e) => sum + Math.max(0, e.count - 1), 0)
  const completionPct = (ownedCount / ALBUM_TOTAL) * 100
  return {
    ownedCount,
    totalCount: ALBUM_TOTAL,
    duplicateCount,
    completionPct,
  }
}

/** @deprecated Prefer the locale-aware `formatEur` from `@/i18n/format`. */
export function formatEur(cents: number, intlLocale: string = 'de-DE'): string {
  return (cents / 100).toLocaleString(intlLocale, { style: 'currency', currency: 'EUR' })
}

/** Cumulative spend over time, used for the simple line chart on stats page. */
export function cumulativeSpend(
  events: { type: string; occurredAt: string; priceCents?: number }[],
): { date: string; cents: number }[] {
  const purchases = events
    .filter((e) => e.type === 'purchase' && (e.priceCents ?? 0) > 0)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  let acc = 0
  return purchases.map((p) => {
    acc += p.priceCents ?? 0
    return { date: p.occurredAt, cents: acc }
  })
}
