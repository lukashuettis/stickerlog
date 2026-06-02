import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { parseTradeText } from '@/lib/tradeCheckParser'
import { buildShareUrl } from '@/lib/tradeCheckUrl'
import { KIND_LIST } from '@/lib/tradeCheckCodec'
import { useT } from '@/i18n/I18nProvider'
import { useToast } from '@/components/ui/Toast'

interface PasteSheetProps {
  open: boolean
  onClose: () => void
}

/**
 * Free-text fallback for the Tausch-Check Start flow. Accepts WhatsApp share
 * text in DE/EN, plain lists, or a complete StickerLog URL. Live-detects
 * sections + counts so the user sees what we understood before they commit.
 */
export function PasteSheet({ open, onClose }: PasteSheetProps) {
  const t = useT()
  const { show } = useToast()
  const navigate = useNavigate()
  const [text, setText] = useState('')

  const parsed = useMemo(() => parseTradeText(text), [text])
  const isEmpty = parsed.seek.length === 0 && parsed.offer.length === 0

  const handleStart = () => {
    if (isEmpty) {
      show(t('tradecheck.paste.empty'), 'info')
      return
    }
    // Build a fresh payload from what we parsed and navigate to the result.
    try {
      const url = buildShareUrl({
        kind: KIND_LIST,
        seek: parsed.seek,
        offer: parsed.offer,
      })
      // Extract the hash path part to navigate locally (avoids reload).
      const hashIdx = url.indexOf('#')
      const hashPath = hashIdx >= 0 ? url.slice(hashIdx + 1) : url
      onClose()
      navigate(hashPath)
    } catch (e) {
      console.error(e)
      show(t('tradecheck.error.title'), 'error')
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="pt-1 pb-2">
        <h2 className="text-lg font-extrabold m-0 mb-3">
          {t('tradecheck.paste.title')}
        </h2>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('tradecheck.paste.placeholder')}
          className="w-full h-40 p-3 rounded-xl bg-muted border border-border text-sm leading-relaxed resize-none"
        />
        <div className="mt-2 text-xs text-muted-foreground">
          {isEmpty
            ? t('tradecheck.paste.detectedNothing')
            : t('tradecheck.paste.detected', {
                seek: parsed.seek.length,
                offer: parsed.offer.length,
              })}
          {parsed.invalid.length > 0 && (
            <span className="ml-2 text-destructive">
              · {t('tradecheck.paste.invalid', { n: parsed.invalid.length })}
            </span>
          )}
        </div>
        <Button onClick={handleStart} className="mt-4 w-full" disabled={isEmpty}>
          {t('tradecheck.paste.start')}
        </Button>
      </div>
    </BottomSheet>
  )
}
