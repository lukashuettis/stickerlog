/**
 * Locale-aware formatters. Built on Intl.* so we don't need a library.
 * Always pass an explicit Intl tag ('de-DE' / 'en-US') to avoid surprises
 * from the runtime default.
 */

export function formatEur(cents: number, intlLocale: string): string {
  return (cents / 100).toLocaleString(intlLocale, {
    style: 'currency',
    currency: 'EUR',
  })
}

export function formatDate(iso: string, intlLocale: string): string {
  return new Date(iso).toLocaleDateString(intlLocale)
}

export function formatDateShort(iso: string, intlLocale: string): string {
  return new Date(iso).toLocaleDateString(intlLocale, {
    day: '2-digit',
    month: '2-digit',
  })
}

export function formatDateLong(iso: string, intlLocale: string): string {
  return new Date(iso).toLocaleDateString(intlLocale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Relative time, short form. "vor 5 Min" / "5 min ago".
 * Falls back to a short date for anything older than a week.
 */
export interface RelativeStrings {
  justNow: string
  minutesAgo: (n: number) => string
  hoursAgo: (n: number) => string
  daysAgo: (n: number) => string
}

export function relativeShort(
  iso: string,
  intlLocale: string,
  s: RelativeStrings,
): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMin = Math.round((now - then) / 60000)
  if (diffMin < 1) return s.justNow
  if (diffMin < 60) return s.minutesAgo(diffMin)
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return s.hoursAgo(diffH)
  const diffD = Math.round(diffH / 24)
  if (diffD < 7) return s.daysAgo(diffD)
  return formatDateShort(iso, intlLocale)
}
