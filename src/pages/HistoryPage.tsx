import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Repeat,
  Gift,
  Wrench,
  ShoppingBag,
  Undo2,
  MoreHorizontal,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { TopBar } from '@/components/ui/TopBar'
import { IconBtn } from '@/components/ui/IconBtn'
import { useEvents, useItems } from '@/hooks/useCollection'
import { useToast } from '@/components/ui/Toast'
import { deleteEvent } from '@/lib/db'
import { useT, useI18n } from '@/i18n/I18nProvider'
import { formatEur, relativeShort } from '@/i18n/format'
import { productNameKey } from '@/data/product-templates'
import { cn } from '@/lib/cn'
import type { AcquisitionEvent, AcquisitionEventType, AcquisitionItem } from '@/lib/types'
import { PackHistoryPage } from './PackHistoryPage'
import type { MessageKey } from '@/i18n/messages'

type Filter = 'all' | 'purchases' | 'trades' | 'gifts' | 'corrections'

/**
 * Unified history of every event the user has logged. Drives both the
 * "Meine Käufe" sidebar entry (?filter=purchases) and the "Alle Tausche"
 * link from TradePage (?filter=trades). The header subtitle adapts to the
 * active filter so the page feels contextual even though the route is one.
 */
export function HistoryPage() {
  const t = useT()
  const { locale } = useI18n()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterParam = (searchParams.get('filter') as Filter | null) ?? 'all'
  const [filter, setFilter] = useState<Filter>(filterParam)
  const eventsRaw = useEvents()
  const itemsRaw = useItems()
  const events = useMemo(() => eventsRaw ?? [], [eventsRaw])
  const items = useMemo(() => itemsRaw ?? [], [itemsRaw])
  const { show } = useToast()

  const filtered = useMemo(() => {
    return events.filter((e) => matchesFilter(e.type, filter))
  }, [events, filter])

  const itemsByEventId = useMemo(() => {
    const m = new Map<number, AcquisitionItem[]>()
    for (const it of items) {
      const list = m.get(it.eventId) ?? []
      list.push(it)
      m.set(it.eventId, list)
    }
    return m
  }, [items])

  // For backwards compatibility: when the sidebar still leads here with
  // ?filter=purchases, render the original rich purchases page (full edit
  // flow, cost stats etc.) — it's well-tested. Other filters use the
  // simpler unified list.
  const isPurchases = (filter as Filter) === 'purchases'
  if (isPurchases) {
    return <PackHistoryPage />
  }

  const setFilterPersisted = (f: Filter) => {
    setFilter(f)
    if (f === 'all') searchParams.delete('filter')
    else searchParams.set('filter', f)
    setSearchParams(searchParams, { replace: true })
  }

  return (
    <div>
      <TopBar
        large
        title={titleFor(filter, t)}
        subtitle={t('history.subtitle')}
        left={
          <IconBtn
            icon={<ArrowLeft size={22} />}
            onClick={() => navigate(-1)}
            label={t('common.back')}
          />
        }
      />

      {/* Filter chips — Korrekturen hides under "Mehr" on small screens so
          the row never has to scroll horizontally. Desktop sees all. */}
      <div className="px-5 pt-3 pb-1 flex items-center gap-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1 min-w-0">
          <Chip active={filter === 'all'} onClick={() => setFilterPersisted('all')}>
            {t('history.filterAll')}
          </Chip>
          <Chip
            active={filter === 'purchases'}
            onClick={() => setFilterPersisted('purchases')}
          >
            {t('history.filterPurchases')}
          </Chip>
          <Chip
            active={filter === 'trades'}
            onClick={() => setFilterPersisted('trades')}
          >
            {t('history.filterTrades')}
          </Chip>
          <Chip
            active={filter === 'gifts'}
            onClick={() => setFilterPersisted('gifts')}
          >
            {t('history.filterGifts')}
          </Chip>
          {/* Corrections chip is visible on desktop only — see below for the More menu */}
          <span className="hidden lg:inline-flex">
            <Chip
              active={filter === 'corrections'}
              onClick={() => setFilterPersisted('corrections')}
            >
              {t('history.filterCorrections')}
            </Chip>
          </span>
        </div>
        <MoreFilterMenu
          activeIsCorrection={filter === 'corrections'}
          onSelectCorrections={() => setFilterPersisted('corrections')}
        />
      </div>

      <div className="px-5 pt-3 space-y-2">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {t('history.empty')}
          </Card>
        ) : (
          filtered.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              items={itemsByEventId.get(e.id!) ?? []}
              onUndo={async () => {
                if (!confirm(t('trades.recent.undoConfirm'))) return
                await deleteEvent(e.id!)
                show(t('trades.recent.undone'))
              }}
              locale={locale}
            />
          ))
        )}
      </div>
    </div>
  )
}

function MoreFilterMenu({
  activeIsCorrection,
  onSelectCorrections,
}: {
  activeIsCorrection: boolean
  onSelectCorrections: () => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <div className="relative lg:hidden flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('history.filterMore')}
        title={t('history.filterMore')}
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center border bg-card',
          activeIsCorrection
            ? 'border-primary text-primary'
            : 'border-border text-muted-foreground',
        )}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute top-full right-0 mt-1 z-40 min-w-[180px] bg-card border border-border rounded-xl shadow-token-lg p-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onSelectCorrections()
              }}
              className="w-full text-left px-3 py-2 text-sm font-semibold rounded-lg hover:bg-muted bg-transparent border-none"
            >
              {t('history.filterCorrections')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function titleFor(filter: Filter, t: ReturnType<typeof useT>): string {
  switch (filter) {
    case 'trades':
      return t('history.filterTrades')
    case 'gifts':
      return t('history.filterGifts')
    case 'corrections':
      return t('history.filterCorrections')
    default:
      return t('history.title')
  }
}

function matchesFilter(type: AcquisitionEventType, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'purchases') return type === 'purchase'
  if (filter === 'trades') return type === 'trade'
  if (filter === 'gifts') return type === 'gift'
  if (filter === 'corrections') return type === 'correction'
  return false
}

interface EventCardProps {
  event: AcquisitionEvent
  items: AcquisitionItem[]
  onUndo: () => void
  locale: 'de' | 'en'
}

function EventCard({ event, items, onUndo, locale }: EventCardProps) {
  const t = useT()
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
  const inCount = items.filter((i) => i.direction === 'in').length
  const outCount = items.filter((i) => i.direction === 'out').length

  const Icon =
    event.type === 'purchase'
      ? ShoppingBag
      : event.type === 'trade'
        ? Repeat
        : event.type === 'gift'
          ? Gift
          : Wrench
  const tone =
    event.type === 'purchase'
      ? 'primary'
      : event.type === 'trade'
        ? 'primary'
        : event.type === 'gift'
          ? 'amber'
          : 'muted'

  const summary =
    event.type === 'purchase'
      ? `${t(productNameKey(event.productTemplateId ?? 'custom') as MessageKey)}${
          event.priceCents != null ? ' · ' + formatEur(event.priceCents, locale === 'de' ? 'de-DE' : 'en-US') : ''
        }`
      : event.type === 'trade'
        ? t('trades.recent.trade', { inN: inCount, outN: outCount })
        : event.type === 'gift'
          ? t('trades.recent.gift', { n: outCount })
          : t('trades.recent.correction', { n: outCount })

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex items-stretch">
        <div
          className={cn(
            'flex items-center justify-center w-14 flex-shrink-0',
            tone === 'primary' && 'bg-primary-soft text-primary-soft-foreground',
            tone === 'amber' && 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
            tone === 'muted' && 'bg-muted text-muted-foreground',
          )}
        >
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0 px-3 py-3 flex items-center gap-3">
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
          {event.type !== 'purchase' && (
            <button
              type="button"
              onClick={onUndo}
              aria-label={t('trades.recent.undo')}
              title={t('trades.recent.undo')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground bg-transparent border-none px-2 py-1 flex-shrink-0"
            >
              <Undo2 size={14} />
              <span className="hidden lg:inline">{t('trades.recent.undo')}</span>
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
