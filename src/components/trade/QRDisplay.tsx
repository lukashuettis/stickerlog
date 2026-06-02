import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { AlertTriangle } from 'lucide-react'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { useT } from '@/i18n/I18nProvider'

interface QRDisplayProps {
  open: boolean
  onClose: () => void
  url: string
}

/**
 * Renders the share URL as a high-density, high-contrast QR.
 *
 * Three explicit states:
 *   - loading: shown for the moment between mount and canvas paint, avoids
 *     the "blank canvas" flash users sometimes catch on slower devices
 *   - error:   contained failure state with a fallback CTA
 *   - ready:   the QR canvas itself
 */
export function QRDisplay({ open, onClose, url }: QRDisplayProps) {
  const t = useT()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!open || !canvasRef.current) return
    let cancelled = false
    setState('loading')
    void (async () => {
      try {
        await QRCode.toCanvas(canvasRef.current!, url, {
          width: 480,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#0a0a0a', light: '#ffffff' },
        })
        if (cancelled) return
        setState('ready')
      } catch (e) {
        if (cancelled) return
        console.warn('QR render failed', e)
        setState('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, url])

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="pt-1 pb-2 text-center">
        <h2 className="text-lg font-extrabold m-0 mb-1">{t('tradecheck.qr.title')}</h2>
        <p className="text-xs text-muted-foreground m-0 mb-4">
          {t('tradecheck.qr.subtitle')}
        </p>

        {state === 'error' && (
          <div className="py-6">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3">
              <AlertTriangle size={24} />
            </div>
            <p className="text-sm text-muted-foreground m-0">
              {t('tradecheck.qr.qrError')}
            </p>
          </div>
        )}

        {state !== 'error' && (
          <div className="bg-white rounded-2xl p-4 inline-block mx-auto relative">
            {state === 'loading' && (
              <div className="absolute inset-4 flex items-center justify-center text-xs text-muted-foreground bg-white">
                {t('tradecheck.qr.qrLoading')}
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="block max-w-full h-auto"
              style={{ maxWidth: 320 }}
            />
          </div>
        )}

        <Button variant="outline" onClick={onClose} className="mt-4 w-full">
          {t('tradecheck.qr.cancel')}
        </Button>
      </div>
    </BottomSheet>
  )
}
