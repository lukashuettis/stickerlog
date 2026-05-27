import { useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Flag } from '@/components/ui/Flag'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useEvents, useItemsForSticker } from '@/hooks/useCollection'
import { deleteEvent } from '@/lib/db'
import { useI18n } from '@/i18n/I18nProvider'
import { formatDate, formatEur } from '@/i18n/format'
import type { AcquisitionEvent, AlbumSlot, Team } from '@/lib/types'
import { cn } from '@/lib/cn'

interface Props {
  open: boolean
  onClose: () => void
  sticker: AlbumSlot | null
  team: Team | null
}

export function StickerHistorySheet({ open, onClose, sticker, team }: Props) {
  const rawEvents = useEvents()
  const rawItems = useItemsForSticker('album', sticker?.id ?? '')
  const allEvents = useMemo(() => rawEvents ?? [], [rawEvents])
  const items = useMemo(() => rawItems ?? [], [rawItems])
  const { show } = useToast()
  const { t, intlLocale } = useI18n()

  const entries = useMemo(() => {
    const eventById = new Map<number, AcquisitionEvent>()
    for (const e of allEvents) {
      if (e.id !== undefined) eventById.set(e.id, e)
    }
    return items
      .map((it) => ({ item: it, event: eventById.get(it.eventId) }))
      .filter((p) => p.event !== undefined)
      .sort((a, b) =>
        (b.item.acquiredAt || '').localeCompare(a.item.acquiredAt || ''),
      )
  }, [items, allEvents])

  if (!sticker) return null

  const entriesLabel =
    entries.length === 1
      ? t('history.entriesOne', { n: 1 })
      : t('history.entriesOther', { n: entries.length })

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        {team && <Flag team={team} size={40} />}
        <div className="flex-1">
          <div className="text-sm font-bold">{t('history.titleFor', { id: sticker.id })}</div>
          <div className="text-xs text-muted-foreground">{entriesLabel}</div>
        </div>
      </div>

      {entries.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-6">
          {t('history.empty')}
        </div>
      )}

      <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
        {entries.map(({ item, event }) => {
          if (!event) return null
          return (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-muted flex items-start gap-3"
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                  item.direction === 'in'
                    ? 'bg-primary text-white'
                    : 'bg-destructive text-white',
                )}
              >
                {item.direction === 'in' ? '+' : '−'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">{eventLabel(event, t)}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-2">
                  <span>{formatDate(item.acquiredAt, intlLocale)}</span>
                  {event.store && <span>· {event.store}</span>}
                  {event.priceCents !== undefined && event.priceCents > 0 && (
                    <span>· {formatEur(event.priceCents, intlLocale)}</span>
                  )}
                  {item.itemKind !== 'album' && (
                    <span className="text-warning">· {item.itemKind}</span>
                  )}
                  {!item.wasNew && item.direction === 'in' && (
                    <span>· {t('history.itemDuplicate')}</span>
                  )}
                </div>
                {event.notes && (
                  <div className="text-xs text-muted-foreground mt-1 italic">
                    {event.notes}
                  </div>
                )}
              </div>
              {event.id !== undefined && (
                <button
                  onClick={async () => {
                    if (!confirm(t('history.deleteConfirm'))) return
                    await deleteEvent(event.id!)
                    show(t('history.deletedToast'))
                  }}
                  className="p-2 text-muted-foreground hover:text-destructive"
                  aria-label={t('common.delete')}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      <Button full variant="outline" className="mt-4" onClick={onClose}>
        {t('common.close')}
      </Button>
    </BottomSheet>
  )
}

function eventLabel(
  event: AcquisitionEvent,
  t: (key: import('@/i18n/messages').MessageKey, params?: Record<string, string | number>) => string,
): string {
  if (event.type === 'purchase') return t('history.eventPurchase')
  if (event.type === 'trade') {
    return event.tradePartner
      ? t('history.eventTradeWith', { who: event.tradePartner })
      : t('history.eventTrade')
  }
  if (event.type === 'gift') return t('history.eventGift')
  if (event.type === 'promo') return event.promoName ?? t('history.eventPromo')
  return t('history.eventCorrection')
}
