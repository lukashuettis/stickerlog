import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Repeat, Gift, Wrench, ChevronRight, Undo2 } from 'lucide-react'
import { Card } from '../ui/Card'
import { db, deleteEvent } from '@/lib/db'
import { useToast } from '@/components/ui/Toast'
import { useT, useI18n } from '@/i18n/I18nProvider'
import { relativeShort } from '@/i18n/format'
import { cn } from '@/lib/cn'
import type { AcquisitionEvent } from '@/lib/types'

/**
 * Compact preview of the last 3 trade-ish events on TradePage. Each row is
 * read-only with a single "Rückgängig" affordance that removes the event +
 * its items + triggers a cache rebuild.
 */
export function RecentTrades() {
  const t = useT()
  const { locale } = useI18n()
  const navigate = useNavigate()
  const { show } = useToast()

  const recent = useLiveQuery(
    () =>
      db.events
        .orderBy('occurredAt')
        .reverse()
        .filter(
          (e) => e.type === 'trade' || e.type === 'gift' || e.type === 'correction',
        )
        .limit(3)
        .toArray(),
    [],
    [],
  )

  const inOutCounts = useLiveQuery(
    async () => {
      if (!recent || recent.length === 0) return new Map<number, { inN: number; outN: number }>()
      const ids = recent.map((e) => e.id!).filter(Boolean)
      const items = await db.items.where('eventId').anyOf(ids).toArray()
      const map = new Map<number, { inN: number; outN: number }>()
      for (const id of ids) map.set(id, { inN: 0, outN: 0 })
      for (const item of items) {
        const entry = map.get(item.eventId)
        if (!entry) continue
        if (item.direction === 'in') entry.inN++
        else entry.outN++
      }
      return map
    },
    [recent],
    new Map<number, { inN: number; outN: number }>(),
  )

  const handleUndo = async (e: AcquisitionEvent) => {
    if (!e.id) return
    if (!confirm(t('trades.recent.undoConfirm'))) return
    await deleteEvent(e.id)
    show(t('trades.recent.undone'))
  }

  const list = recent ?? []
  const counts = inOutCounts ?? new Map<number, { inN: number; outN: number }>()

  return (
    <section className="px-5 lg:px-0 pt-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground m-0">
          {t('trades.recent.title')}
        </h3>
        <button
          type="button"
          onClick={() => navigate('/history?filter=trades')}
          className="text-xs font-semibold text-primary inline-flex items-center gap-0.5 bg-transparent border-none"
        >
          {t('trades.recent.viewAll')}
          <ChevronRight size={12} />
        </button>
      </div>

      {list.length === 0 ? (
        <Card className="p-4 text-center text-xs text-muted-foreground">
          {t('trades.recent.empty')}
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((e) => (
            <RecentRow
              key={e.id}
              event={e}
              counts={counts.get(e.id!) ?? { inN: 0, outN: 0 }}
              onUndo={() => handleUndo(e)}
              locale={locale}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function RecentRow({
  event,
  counts,
  onUndo,
  locale,
}: {
  event: AcquisitionEvent
  counts: { inN: number; outN: number }
  onUndo: () => void
  locale: 'de' | 'en'
}) {
  const t = useT()
  const Icon =
    event.type === 'trade' ? Repeat : event.type === 'gift' ? Gift : Wrench
  const tone =
    event.type === 'trade'
      ? 'primary'
      : event.type === 'gift'
        ? 'amber'
        : 'muted'
  const when = useMemo(
    () =>
      relativeShort(event.occurredAt, locale === 'de' ? 'de' : 'en', {
        justNow: locale === 'de' ? 'gerade eben' : 'just now',
        minutesAgo: (n) => (locale === 'de' ? `vor ${n} Min.` : `${n} min ago`),
        hoursAgo: (n) => (locale === 'de' ? `vor ${n} Std.` : `${n}h ago`),
        daysAgo: (n) => (locale === 'de' ? `vor ${n} Tagen` : `${n}d ago`),
      }),
    [event.occurredAt, locale],
  )

  const summary =
    event.type === 'trade'
      ? t('trades.recent.trade', { inN: counts.inN, outN: counts.outN })
      : event.type === 'gift'
        ? t('trades.recent.gift', { n: counts.outN })
        : t('trades.recent.correction', { n: counts.outN })

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex items-stretch">
        <div
          className={cn(
            'flex items-center justify-center w-12 flex-shrink-0',
            tone === 'primary' && 'bg-primary-soft text-primary-soft-foreground',
            tone === 'amber' && 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
            tone === 'muted' && 'bg-muted text-muted-foreground',
          )}
        >
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0 px-3 py-2.5 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-muted-foreground">{when}</div>
            <div className="text-sm font-bold truncate">{summary}</div>
            {event.tradePartner && (
              <div className="text-[11px] text-muted-foreground truncate">
                {event.type === 'gift'
                  ? t('trades.recent.giftTo', { who: event.tradePartner })
                  : t('trades.recent.tradeWith', { who: event.tradePartner })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onUndo}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground bg-transparent border-none px-2 py-1 inline-flex items-center gap-1"
            aria-label={t('trades.recent.undo')}
            title={t('trades.recent.undo')}
          >
            <Undo2 size={14} />
            <span className="hidden sm:inline">{t('trades.recent.undo')}</span>
          </button>
        </div>
      </div>
    </Card>
  )
}
