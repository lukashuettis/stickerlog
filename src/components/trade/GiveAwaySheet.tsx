import { useMemo, useState } from 'react'
import { Gift, Wrench, Repeat, AlertTriangle } from 'lucide-react'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { parseStickerCodes } from '@/lib/parse-codes'
import {
  createGiftOutEvent,
  createCorrectionOutEvent,
  createTradeEvent,
  findLastCopies,
  NegativeStockError,
} from '@/lib/db'
import { useT } from '@/i18n/I18nProvider'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

type GiveType = 'gift' | 'correction' | 'trade'

interface GiveAwaySheetProps {
  open: boolean
  onClose: () => void
}

export function GiveAwaySheet({ open, onClose }: GiveAwaySheetProps) {
  const t = useT()
  const { show } = useToast()

  const [type, setType] = useState<GiveType>('gift')
  const [text, setText] = useState('')
  // Trade uses TWO textareas: received (in) and given (out).
  const [textIn, setTextIn] = useState('')
  const [textOut, setTextOut] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [notes, setNotes] = useState('')
  const [warnLast, setWarnLast] = useState<string[] | null>(null)

  const parsed = useMemo(() => parseStickerCodes(text), [text])
  const validIds = parsed.filter((p) => p.valid && p.stickerId).map((p) => p.stickerId!)
  const isEmpty = validIds.length === 0

  const parsedIn = useMemo(() => parseStickerCodes(textIn), [textIn])
  const parsedOut = useMemo(() => parseStickerCodes(textOut), [textOut])
  const validInIds = parsedIn.filter((p) => p.valid && p.stickerId).map((p) => p.stickerId!)
  const validOutIds = parsedOut.filter((p) => p.valid && p.stickerId).map((p) => p.stickerId!)
  const tradeIsEmpty = validInIds.length === 0 && validOutIds.length === 0

  const reset = () => {
    setText('')
    setTextIn('')
    setTextOut('')
    setCounterparty('')
    setNotes('')
    setType('gift')
    setWarnLast(null)
  }

  const tryRunSave = async () => {
    if (type === 'trade') {
      if (tradeIsEmpty) {
        show(t('tradecheck.paste.empty'), 'info')
        return
      }
      if (validOutIds.length > 0) {
        const lasts = await findLastCopies('album', validOutIds)
        if (lasts.length > 0) {
          setWarnLast(lasts)
          return
        }
      }
      await actuallySave()
      return
    }
    if (isEmpty) {
      show(t('tradecheck.paste.empty'), 'info')
      return
    }
    const lasts = await findLastCopies('album', validIds)
    if (lasts.length > 0) {
      setWarnLast(lasts)
      return
    }
    await actuallySave()
  }

  const actuallySave = async () => {
    setWarnLast(null)
    try {
      if (type === 'trade') {
        const inItems = validInIds.map((id) => ({ catalog: 'album' as const, id }))
        const outItems = validOutIds.map((id) => ({ catalog: 'album' as const, id }))
        await createTradeEvent({
          inItems,
          outItems,
          counterparty: counterparty.trim() || undefined,
          notes: notes.trim() || undefined,
        })
        show(
          t('give.savedTrade', { inN: inItems.length, outN: outItems.length }),
          'success',
        )
        reset()
        onClose()
        return
      }
      const outItems = validIds.map((id) => ({ catalog: 'album' as const, id }))
      if (type === 'gift') {
        await createGiftOutEvent({
          outItems,
          counterparty: counterparty.trim() || undefined,
          notes: notes.trim() || undefined,
        })
        show(t('give.savedGift', { n: outItems.length }), 'success')
      } else {
        await createCorrectionOutEvent({
          outItems,
          notes: notes.trim() || undefined,
        })
        show(t('give.savedCorrection'), 'success')
      }
      reset()
      onClose()
    } catch (e) {
      if (e instanceof NegativeStockError) {
        show(t('give.errorStock', { ids: e.stickerIds.join(', ') }), 'error')
      } else {
        console.error(e)
        show(t('tradecheck.error.title'), 'error')
      }
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        onClose()
        reset()
      }}
    >
      <div className="pt-1 pb-2">
        <h2 className="text-lg font-extrabold m-0 mb-3">{t('give.title')}</h2>

        {warnLast ? (
          <>
            <div className="text-center mb-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center mb-3">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-base font-bold m-0 mb-1">
                {t('give.warnLastTitle')}
              </h3>
              <p className="text-sm text-muted-foreground m-0">
                {t('give.warnLastBody', { ids: warnLast.join(', ') })}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setWarnLast(null)}>
                {t('give.cancel')}
              </Button>
              <Button onClick={actuallySave}>{t('give.confirm')}</Button>
            </div>
          </>
        ) : (
          <>
            {/* Segmented control */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-xl mb-3">
              <SegBtn
                active={type === 'gift'}
                onClick={() => setType('gift')}
                icon={<Gift size={14} />}
                label={t('give.type.gift')}
              />
              <SegBtn
                active={type === 'correction'}
                onClick={() => setType('correction')}
                icon={<Wrench size={14} />}
                label={t('give.type.correction')}
              />
              <SegBtn
                active={type === 'trade'}
                onClick={() => setType('trade')}
                icon={<Repeat size={14} />}
                label={t('give.type.trade')}
              />
            </div>

            {type === 'trade' ? (
              <>
                <p className="text-xs text-muted-foreground mb-3 leading-snug">
                  {t('give.type.tradeHint')}
                </p>
                <label className="block mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    {t('give.tradeReceived')}
                  </span>
                  <textarea
                    value={textIn}
                    onChange={(e) => setTextIn(e.target.value)}
                    placeholder={t('give.stickersPh')}
                    className="w-full h-16 p-3 rounded-xl bg-muted border border-border text-sm resize-none"
                  />
                  {validInIds.length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {validInIds.length === 1
                        ? t('tradecheck.paste.detectedGive')
                        : t('tradecheck.paste.detectedGiveN', { n: validInIds.length })}
                    </div>
                  )}
                </label>
                <label className="block mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    {t('give.tradeGiven')}
                  </span>
                  <textarea
                    value={textOut}
                    onChange={(e) => setTextOut(e.target.value)}
                    placeholder={t('give.stickersPh')}
                    className="w-full h-16 p-3 rounded-xl bg-muted border border-border text-sm resize-none"
                  />
                  {validOutIds.length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {validOutIds.length === 1
                        ? t('tradecheck.paste.detectedGive')
                        : t('tradecheck.paste.detectedGiveN', { n: validOutIds.length })}
                    </div>
                  )}
                </label>
                <label className="block mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    {t('give.counterparty')}
                  </span>
                  <input
                    type="text"
                    value={counterparty}
                    onChange={(e) => setCounterparty(e.target.value)}
                    placeholder={t('give.counterpartyPh')}
                    className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-sm"
                  />
                </label>
                <label className="block mb-4">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    {t('give.notes')}
                  </span>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder=""
                    className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-sm"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      onClose()
                      reset()
                    }}
                  >
                    {t('give.cancel')}
                  </Button>
                  <Button onClick={tryRunSave} disabled={tradeIsEmpty}>
                    {t('give.confirm')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {type === 'correction' && (
                  <p className="text-xs text-muted-foreground mb-3 leading-snug">
                    {t('give.type.correctionHint')}
                  </p>
                )}
                <label className="block mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    {t('give.stickers')}
                  </span>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('give.stickersPh')}
                    className="w-full h-20 p-3 rounded-xl bg-muted border border-border text-sm resize-none"
                  />
                  {!isEmpty && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {validIds.length === 1
                        ? t('tradecheck.paste.detectedGive')
                        : t('tradecheck.paste.detectedGiveN', { n: validIds.length })}
                    </div>
                  )}
                </label>
                {type === 'gift' && (
                  <label className="block mb-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                      {t('give.counterparty')}
                    </span>
                    <input
                      type="text"
                      value={counterparty}
                      onChange={(e) => setCounterparty(e.target.value)}
                      placeholder={t('give.counterpartyPh')}
                      className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-sm"
                    />
                  </label>
                )}
                <label className="block mb-4">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    {t('give.notes')}
                  </span>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder=""
                    className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-sm"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      onClose()
                      reset()
                    }}
                  >
                    {t('give.cancel')}
                  </Button>
                  <Button onClick={tryRunSave} disabled={isEmpty}>
                    {t('give.confirm')}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  )
}

function SegBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-9 rounded-md text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors',
        active
          ? 'bg-card text-foreground shadow-token-sm'
          : 'bg-transparent text-muted-foreground',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
