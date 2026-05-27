import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, ChevronDown, Pencil, Check, X } from 'lucide-react'
import { TopBar } from '@/components/ui/TopBar'
import { IconBtn } from '@/components/ui/IconBtn'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useEvents, useItems } from '@/hooks/useCollection'
import { deleteEvent, updateEventMeta } from '@/lib/db'
import { getProductTemplate, productNameKey, STORE_OPTIONS } from '@/data/product-templates'
import { useI18n } from '@/i18n/I18nProvider'
import { formatEur, formatDate } from '@/i18n/format'
import type { MessageKey } from '@/i18n/messages'
import type { AcquisitionEvent, AcquisitionItem } from '@/lib/types'
import { cn } from '@/lib/cn'

type SortKey = 'date_desc' | 'date_asc' | 'price_desc' | 'hits_desc' | 'hits_asc'

interface EnrichedPack {
  event: AcquisitionEvent
  items: AcquisitionItem[]
  newCount: number
  dupCount: number
  bonusCount: number
  hitRate: number
}

export function PackHistoryPage() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { t, intlLocale } = useI18n()
  const rawEvents = useEvents()
  const rawItems = useItems()
  const events = useMemo(() => rawEvents ?? [], [rawEvents])
  const items = useMemo(() => rawItems ?? [], [rawItems])
  const [sort, setSort] = useState<SortKey>('date_desc')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)

  const packs = useMemo<EnrichedPack[]>(() => {
    const itemsByEvent = new Map<number, AcquisitionItem[]>()
    for (const it of items) {
      const list = itemsByEvent.get(it.eventId) ?? []
      list.push(it)
      itemsByEvent.set(it.eventId, list)
    }
    return events
      .filter((e) => e.type === 'purchase')
      .map((event) => {
        const its = itemsByEvent.get(event.id ?? -1) ?? []
        const regulars = its.filter(
          (i) => i.itemKind === 'album' && i.direction === 'in',
        )
        const bonusCount = its.filter((i) => i.itemKind !== 'album').length
        const newCount = regulars.filter((i) => i.wasNew).length
        const dupCount = regulars.length - newCount
        const hitRate = regulars.length ? newCount / regulars.length : 0
        return { event, items: its, newCount, dupCount, bonusCount, hitRate }
      })
  }, [events, items])

  const sorted = useMemo(() => {
    const arr = [...packs]
    switch (sort) {
      case 'date_desc':
        return arr.sort((a, b) => b.event.occurredAt.localeCompare(a.event.occurredAt))
      case 'date_asc':
        return arr.sort((a, b) => a.event.occurredAt.localeCompare(b.event.occurredAt))
      case 'price_desc':
        return arr.sort((a, b) => (b.event.priceCents ?? 0) - (a.event.priceCents ?? 0))
      case 'hits_desc':
        return arr.sort((a, b) => b.hitRate - a.hitRate)
      case 'hits_asc':
        return arr.sort((a, b) => a.hitRate - b.hitRate)
    }
  }, [packs, sort])

  const totals = useMemo(() => {
    const totalSpent = packs.reduce((s, p) => s + (p.event.priceCents ?? 0), 0)
    return { totalSpent, count: packs.length }
  }, [packs])

  return (
    <div>
      <div className="lg:hidden">
        <TopBar
          large
          title={t('packs.title')}
          subtitle={t('packs.summary', {
            n: totals.count,
            price: formatEur(totals.totalSpent, intlLocale),
          })}
          left={
            <IconBtn
              icon={<ArrowLeft size={22} />}
              onClick={() => navigate('/')}
              label={t('common.back')}
            />
          }
        />
      </div>

      <div className="hidden lg:flex items-baseline justify-between mb-6 pt-2">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight m-0">{t('packs.title')}</h1>
          <p className="text-[13px] text-muted-foreground mt-1 m-0">
            {t('packs.summaryLong', {
              n: totals.count,
              price: formatEur(totals.totalSpent, intlLocale),
            })}
          </p>
        </div>
      </div>

      {packs.length === 0 ? (
        <div className="px-5 lg:px-0 pt-6">
          <Card className="p-8 text-center">
            <div className="text-base font-bold mb-1">{t('packs.emptyTitle')}</div>
            <p className="text-sm text-muted-foreground mb-4">{t('packs.emptyBody')}</p>
            <Button onClick={() => navigate('/scan')}>{t('packs.emptyCta')}</Button>
          </Card>
        </div>
      ) : (
        <>
          <div className="px-5 lg:px-0 pt-2 lg:pt-0 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <Chip active={sort === 'date_desc'} onClick={() => setSort('date_desc')}>
              {t('packs.sortNewest')}
            </Chip>
            <Chip active={sort === 'date_asc'} onClick={() => setSort('date_asc')}>
              {t('packs.sortOldest')}
            </Chip>
            <Chip active={sort === 'hits_desc'} onClick={() => setSort('hits_desc')}>
              {t('packs.sortBestHits')}
            </Chip>
            <Chip active={sort === 'hits_asc'} onClick={() => setSort('hits_asc')}>
              {t('packs.sortWorstHits')}
            </Chip>
            <Chip active={sort === 'price_desc'} onClick={() => setSort('price_desc')}>
              {t('packs.sortMostExpensive')}
            </Chip>
          </div>

          <div className="px-5 lg:px-0 pt-3 flex flex-col gap-2">
            {sorted.map((pack) => {
              const isOpen = expanded === pack.event.id
              const isEditing = editing === pack.event.id
              return (
                <PackRow
                  key={pack.event.id}
                  pack={pack}
                  open={isOpen}
                  editing={isEditing}
                  onToggle={() =>
                    setExpanded((curr) => (curr === pack.event.id ? null : pack.event.id ?? null))
                  }
                  onEdit={() => {
                    setExpanded(pack.event.id ?? null)
                    setEditing(pack.event.id ?? null)
                  }}
                  onCancelEdit={() => setEditing(null)}
                  onSaved={() => {
                    setEditing(null)
                    show(t('packs.savedToast'))
                  }}
                  onDelete={async () => {
                    if (!confirm(t('packs.deleteConfirm'))) return
                    await deleteEvent(pack.event.id!)
                    show(t('packs.deletedToast'))
                  }}
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Single pack row ──────────────────────────────────────────────────────

interface PackRowProps {
  pack: EnrichedPack
  open: boolean
  editing: boolean
  onToggle: () => void
  onEdit: () => void
  onCancelEdit: () => void
  onSaved: () => void
  onDelete: () => void
}

function PackRow({
  pack,
  open,
  editing,
  onToggle,
  onEdit,
  onCancelEdit,
  onSaved,
  onDelete,
}: PackRowProps) {
  const { t, intlLocale } = useI18n()
  const tpl = pack.event.productTemplateId
    ? getProductTemplate(pack.event.productTemplateId)
    : undefined
  const totalRegular = pack.newCount + pack.dupCount
  const productName = tpl ? t(productNameKey(tpl.id) as MessageKey) : t('product.fallback')

  return (
    <Card padded={false} className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold">{productName}</span>
            {pack.event.store && (
              <span className="text-xs text-muted-foreground">· {pack.event.store}</span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{formatDate(pack.event.occurredAt, intlLocale)}</span>
            <span>·</span>
            <span className="numeric font-semibold text-foreground">
              {formatEur(pack.event.priceCents ?? 0, intlLocale)}
            </span>
            <span>·</span>
            <span className="numeric">
              <span className="text-primary font-bold">
                {pack.newCount} {t('packs.newSuffix')}
              </span>
              {pack.dupCount > 0 && (
                <span className="text-muted-foreground">
                  {' · '}
                  {t('packs.duplicateSuffix', { n: pack.dupCount })}
                </span>
              )}
              {pack.bonusCount > 0 && (
                <span className="text-warning">
                  {' · '}
                  {t('packs.bonusSuffix', { n: pack.bonusCount })}
                </span>
              )}
            </span>
          </div>
        </div>
        <div
          className={cn(
            'text-[11px] font-bold px-2 py-1 rounded-full numeric',
            pack.hitRate > 0.7
              ? 'bg-primary-soft text-primary-soft-foreground'
              : pack.hitRate > 0.4
                ? 'bg-warning/15 text-warning'
                : 'bg-muted text-muted-foreground',
          )}
        >
          {totalRegular ? `${(pack.hitRate * 100).toFixed(0)}%` : '—'}
        </div>
        <ChevronDown
          size={16}
          className={cn(
            'text-muted-foreground transition-transform flex-shrink-0',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && !editing && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          <div>
            <div className="text-[11px] font-bold text-muted-foreground mb-1.5">
              {t('packs.enteredLabel')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pack.items.map((it) => (
                <span
                  key={it.id}
                  className={cn(
                    'text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 numeric',
                    it.itemKind !== 'album'
                      ? 'bg-warning/15 text-warning'
                      : it.wasNew
                        ? 'bg-primary-soft text-primary-soft-foreground'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {it.stickerId}
                  {!it.wasNew && it.itemKind === 'album' && (
                    <span className="opacity-60">{t('packs.itemDup')}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
          {pack.event.notes && (
            <div className="text-[11px] text-muted-foreground italic">
              „{pack.event.notes}"
            </div>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="text-xs font-semibold text-foreground flex items-center gap-1"
            >
              <Pencil size={14} /> {t('common.edit')}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="text-xs font-semibold text-destructive flex items-center gap-1"
            >
              <Trash2 size={14} /> {t('common.delete')}
            </button>
          </div>
        </div>
      )}

      {open && editing && (
        <EditForm
          pack={pack}
          onCancel={onCancelEdit}
          onSaved={onSaved}
        />
      )}
    </Card>
  )
}

// ─── Inline edit form for store / price / date / notes ────────────────────

function EditForm({
  pack,
  onCancel,
  onSaved,
}: {
  pack: EnrichedPack
  onCancel: () => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const [store, setStore] = useState(pack.event.store ?? '')
  const [priceInput, setPriceInput] = useState(
    pack.event.priceCents !== undefined
      ? (pack.event.priceCents / 100).toFixed(2).replace('.', ',')
      : '',
  )
  const [date, setDate] = useState(pack.event.occurredAt.slice(0, 10))
  const [notes, setNotes] = useState(pack.event.notes ?? '')

  const save = async () => {
    const n = parseFloat(priceInput.replace(',', '.'))
    const priceCents = Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0
    await updateEventMeta(pack.event.id!, {
      store: store.trim() || undefined,
      priceCents,
      occurredAt: new Date(date + 'T12:00:00').toISOString(),
      notes: notes.trim() || undefined,
    })
    onSaved()
  }

  return (
    <div className="border-t border-border px-4 py-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
            {t('packs.editStore')}
          </label>
          <select
            value={store}
            onChange={(e) => setStore(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-card border border-border text-foreground text-sm font-semibold outline-none focus:border-primary"
          >
            <option value="">—</option>
            {STORE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {store && !STORE_OPTIONS.includes(store) && (
              <option value={store}>{store}</option>
            )}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
            {t('packs.editPrice')}
          </label>
          <Input
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            suffix="€"
            inputMode="decimal"
            className="h-10"
          />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
          {t('packs.editDate')}
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full h-10 px-3 rounded-xl bg-card border border-border text-foreground text-sm font-semibold outline-none focus:border-primary"
          max={new Date().toISOString().slice(0, 10)}
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
          {t('packs.editNote')}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('packs.editNotePlaceholder')}
          className="w-full min-h-[56px] p-2.5 rounded-xl bg-card border border-border text-foreground text-sm resize-none outline-none focus:border-primary"
        />
      </div>
      <div className="text-[11px] text-muted-foreground">{t('packs.editHint')}</div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" icon={<X size={14} />} onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button full size="sm" icon={<Check size={14} strokeWidth={3} />} onClick={save}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  )
}
