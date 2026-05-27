import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TopBar } from '@/components/ui/TopBar'
import { IconBtn } from '@/components/ui/IconBtn'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { db, createEvent } from '@/lib/db'
import { parseStickerCodes } from '@/lib/parse-codes'
import {
  PRODUCT_TEMPLATES,
  STORE_OPTIONS,
  getProductTemplate,
  productNameKey,
  suggestPriceCents,
} from '@/data/product-templates'
import { cn } from '@/lib/cn'
import type { ItemKind } from '@/lib/types'
import { useT } from '@/i18n/I18nProvider'
import type { MessageKey } from '@/i18n/messages'

// `parseStickerCodes` lives in `@/lib/parse-codes` so the tolerant-parser
// logic is unit-testable in isolation. Imported under the shorter local
// name `parseCodes` for tight JSX.
const parseCodes = parseStickerCodes

/**
 * Sticker eintragen — the one and only acquisition flow the user sees up
 * front. Purchase fields (product, store, price) are collapsed by default;
 * Bonus is hidden unless the chosen product specifies bonus items or the
 * user adds it explicitly. No event-type wizard.
 *
 * Trade/Gift/Promo/Correction live as their own dedicated entry points
 * elsewhere (Trade tab, sticker history sheet) and don't pollute this page.
 */
export function OpenPackPage() {
  const navigate = useNavigate()
  const { show } = useToast()
  const t = useT()

  // Product / store / price (collapsible — default closed)
  const [templateId, setTemplateId] = useState<string>('pack_7')
  const [store, setStore] = useState<string>('')
  const [priceInput, setPriceInput] = useState<string>('1,50')
  const [priceTouched, setPriceTouched] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [bonusOpen, setBonusOpen] = useState(false)

  // Codes
  const [regularText, setRegularText] = useState('')
  const [bonusText, setBonusText] = useState('')

  const template = useMemo(() => getProductTemplate(templateId), [templateId])
  const templateHasBonus = (template?.bonusItems.length ?? 0) > 0

  // Auto-suggest price when product or store change, unless the user
  // already touched the field manually.
  const suggestedPriceInput = useMemo(() => {
    const cents = suggestPriceCents(templateId, store || 'Edeka')
    return cents !== undefined ? (cents / 100).toFixed(2).replace('.', ',') : null
  }, [templateId, store])

  useEffect(() => {
    if (priceTouched) return
    if (suggestedPriceInput === null) return
    queueMicrotask(() =>
      setPriceInput((curr) => (curr === suggestedPriceInput ? curr : suggestedPriceInput)),
    )
  }, [suggestedPriceInput, priceTouched])

  // Remember last store between sessions
  useEffect(() => {
    void db.settings.get('lastStore').then((r) => {
      if (r?.value && typeof r.value === 'string') setStore(r.value as string)
    })
  }, [])

  // Auto-open bonus area when a product with bonus items is selected.
  // Deferred via queueMicrotask so the setState runs outside the synchronous
  // render path (satisfies react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!templateHasBonus) return
    queueMicrotask(() => setBonusOpen((curr) => (curr ? curr : true)))
  }, [templateHasBonus])

  const regular = useMemo(() => parseCodes(regularText), [regularText])
  const bonus = useMemo(() => parseCodes(bonusText), [bonusText])
  const regularValid = regular.filter((p) => p.valid).length
  const bonusValid = bonus.filter((p) => p.valid).length

  const expectedRegular = template?.paidStickerCount ?? 7
  const incomplete = regularValid > 0 && regularValid < expectedRegular

  const handleSave = async () => {
    if (regularValid === 0 && bonusValid === 0) {
      show(t('capture.invalidCode'), 'error')
      return
    }
    const priceCents = parsePriceCents(priceInput)
    await createEvent(
      {
        type: 'purchase',
        productTemplateId: templateId,
        store: store.trim() || undefined,
        priceCents,
        expectedPaidStickerCount: template?.paidStickerCount ?? expectedRegular,
        occurredAt: new Date().toISOString(),
      },
      [
        ...regular
          .filter((p) => p.valid)
          .map((p) => ({
            stickerCatalog: 'album' as const,
            stickerId: p.stickerId!,
            itemKind: 'album' as ItemKind,
          })),
        ...bonus
          .filter((p) => p.valid)
          .map((p) => ({
            stickerCatalog: 'album' as const,
            stickerId: p.stickerId!,
            itemKind: 'bonus' as ItemKind,
          })),
      ],
    )
    if (store.trim()) {
      await db.settings.put({ key: 'lastStore', value: store.trim() })
    }
    const count = bonusValid > 0 ? regularValid + bonusValid : regularValid
    show(t('capture.savedToast', { n: count, price: `${priceInput} €` }))
    navigate('/')
  }

  return (
    <div>
      <TopBar
        large
        title={t('capture.title')}
        left={
          <IconBtn
            icon={<ArrowLeft size={22} />}
            onClick={() => navigate('/')}
            label={t('common.back')}
          />
        }
      />

      <div className="px-5 pt-1 space-y-3">
        {/* Codes — primary */}
        <Card className="p-4 border-2 border-primary">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <div className="text-[15px] font-extrabold tracking-tight">
                {t('capture.codesLabel')}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('capture.codesHint', { n: expectedRegular })}
              </div>
            </div>
            {regularValid > 0 && (
              <span
                className={cn(
                  'numeric text-xs font-bold',
                  incomplete ? 'text-warning' : 'text-primary',
                )}
              >
                {regularValid} / {expectedRegular}
              </span>
            )}
          </div>

          <textarea
            value={regularText}
            onChange={(e) => setRegularText(e.target.value)}
            placeholder={t('capture.codesPlaceholder')}
            autoCapitalize="characters"
            spellCheck={false}
            className={cn(
              'w-full min-h-[88px] p-3.5 rounded-xl bg-background border border-border',
              'text-foreground text-[17px] font-mono font-semibold leading-relaxed',
              'tracking-wide resize-none outline-none focus:border-primary',
            )}
          />

          {regular.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {regular.map((p, i) => (
                <span
                  key={i}
                  className={cn(
                    'text-xs font-bold px-2 py-1 rounded-md inline-flex items-center gap-1',
                    p.valid
                      ? 'bg-primary-soft text-primary-soft-foreground'
                      : 'bg-destructive/10 text-destructive',
                  )}
                >
                  {p.valid ? (
                    <Check size={11} strokeWidth={3} />
                  ) : (
                    <AlertCircle size={11} />
                  )}
                  <span className="numeric">{p.input}</span>
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Product & price — collapsed by default */}
        <Card className="p-0 overflow-hidden">
          <button
            onClick={() => setOptionsOpen((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[13px] font-semibold text-muted-foreground">
                {t('capture.packAndPrice')}
              </span>
              <span className="numeric text-sm font-bold truncate">
                · {template ? t(productNameKey(template.id) as MessageKey) : t('product.fallback')}
                {store && ` · ${store}`}
                {` · ${priceInput} €`}
              </span>
            </div>
            {optionsOpen ? (
              <ChevronUp size={18} className="text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronDown size={18} className="text-muted-foreground flex-shrink-0" />
            )}
          </button>
          {optionsOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {t('capture.product')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRODUCT_TEMPLATES.filter((tpl) => tpl.id !== 'custom').map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setTemplateId(tpl.id)}
                      className={cn(
                        'h-11 px-3 rounded-lg text-[13px] font-semibold border text-left',
                        templateId === tpl.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-foreground border-border',
                      )}
                    >
                      {t(productNameKey(tpl.id) as MessageKey)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    {t('capture.boughtAt')}
                  </label>
                  <select
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-card border border-border text-foreground text-sm font-semibold outline-none focus:border-primary"
                  >
                    <option value="">—</option>
                    {STORE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    {t('capture.price')}
                  </label>
                  <Input
                    value={priceInput}
                    onChange={(e) => {
                      setPriceInput(e.target.value)
                      setPriceTouched(true)
                    }}
                    suffix="€"
                    inputMode="decimal"
                  />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Bonus — only visible if the chosen template has bonus items or user
            explicitly added it. Keeps the standard pouch flow minimal. */}
        {(templateHasBonus || bonusOpen) && (
          <Card className="p-0 overflow-hidden">
            <button
              onClick={() => setBonusOpen((v) => !v)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[13px] font-semibold text-muted-foreground">
                  {t('capture.bonusLabel')}
                </span>
                {templateHasBonus && (
                  <span className="text-xs text-muted-foreground truncate">
                    {t('capture.bonusInPack', {
                      n: template?.bonusItems[0]?.count ?? 0,
                    })}
                  </span>
                )}
              </div>
              {bonusOpen ? (
                <ChevronUp size={18} className="text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown size={18} className="text-muted-foreground flex-shrink-0" />
              )}
            </button>
            {bonusOpen && (
              <div className="px-4 pb-4 border-t border-border pt-3">
                <textarea
                  value={bonusText}
                  onChange={(e) => setBonusText(e.target.value)}
                  placeholder={t('capture.bonusPlaceholder')}
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="w-full min-h-[64px] p-3.5 rounded-xl bg-background border border-border text-foreground text-[15px] font-mono font-semibold resize-none outline-none focus:border-primary"
                />
                {bonus.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {bonus.map((p, i) => (
                      <span
                        key={i}
                        className={cn(
                          'text-xs font-bold px-2 py-1 rounded-md inline-flex items-center gap-1',
                          p.valid
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-destructive/10 text-destructive',
                        )}
                      >
                        {p.valid ? (
                          <Check size={11} strokeWidth={3} />
                        ) : (
                          <AlertCircle size={11} />
                        )}
                        <span className="numeric">{p.input}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Add-bonus link when not yet open and template has none */}
        {!bonusOpen && !templateHasBonus && (
          <button
            onClick={() => setBonusOpen(true)}
            className="text-sm font-semibold text-muted-foreground underline self-start"
          >
            {t('capture.addBonus')}
          </button>
        )}

        {/* Save */}
        <Button
          full
          size="lg"
          disabled={regularValid === 0 && bonusValid === 0}
          icon={<Plus size={20} strokeWidth={2.5} />}
          onClick={handleSave}
        >
          {saveLabel(t, { regularValid, bonusValid, expectedRegular })}
        </Button>
        {incomplete && (
          <div className="text-xs text-warning text-center -mt-1">
            {t('capture.incompleteWarning', { n: regularValid, total: expectedRegular })}
          </div>
        )}

        <div className="pt-3 pb-2 text-center text-[11px] text-muted-foreground leading-relaxed">
          {t('capture.localData')}
        </div>
      </div>
    </div>
  )
}

function parsePriceCents(input: string): number {
  const n = parseFloat(input.replace(',', '.'))
  if (Number.isFinite(n) && n >= 0) return Math.round(n * 100)
  return 0
}

interface SaveLabelArgs {
  regularValid: number
  bonusValid: number
  expectedRegular: number
}

function saveLabel(
  t: (key: MessageKey, params?: Record<string, string | number>) => string,
  { regularValid, bonusValid, expectedRegular }: SaveLabelArgs,
): string {
  if (regularValid === 0 && bonusValid === 0) return t('capture.save')
  if (regularValid < expectedRegular) {
    return t('capture.saveIncomplete', { n: regularValid, total: expectedRegular })
  }
  if (bonusValid > 0) {
    return t('capture.saveWithBonus', { n: regularValid, bonus: bonusValid })
  }
  return t('capture.saveCount', { n: regularValid })
}
