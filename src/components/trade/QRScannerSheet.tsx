import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QrScanner from 'qr-scanner'
import { CameraOff, AlertTriangle, ClipboardPaste } from 'lucide-react'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { useT } from '@/i18n/I18nProvider'
import { looksLikePayload } from '@/lib/tradeCheckCodec'

const PasteSheet = lazy(() =>
  import('./PasteSheet').then((m) => ({ default: m.PasteSheet })),
)

// vite-plugin-pwa serves /qr-scanner-worker.min.js from public/.
// Because the app's base path may be /stickerlog/, we resolve at runtime.
const WORKER_PATH = `${window.location.origin}${import.meta.env.BASE_URL}qr-scanner-worker.min.js`
QrScanner.WORKER_PATH = WORKER_PATH

interface QRScannerSheetProps {
  open: boolean
  onClose: () => void
}

/**
 * Camera-based QR scanner. Decodes our /trade/check/<payload> URLs as well
 * as any plain payload string. On a successful read, navigates straight to
 * the result page so the user lands in the match the moment they scan.
 */
export function QRScannerSheet({ open, onClose }: QRScannerSheetProps) {
  const t = useT()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(true)
  const [pasteOpen, setPasteOpen] = useState(false)

  useEffect(() => {
    if (!open || !videoRef.current) return
    let cancelled = false

    void (async () => {
      try {
        const hasCamera = await QrScanner.hasCamera()
        if (!hasCamera) {
          setError(t('tradecheck.qr.noCamera'))
          setStarting(false)
          return
        }
        const scanner = new QrScanner(
          videoRef.current!,
          (result) => {
            const data = result.data
            const url = parseScanResult(data)
            if (url) {
              scanner.stop()
              onClose()
              // Navigate inside the hash route — use the local fragment path.
              const hashIdx = url.indexOf('#')
              const hashPath = hashIdx >= 0 ? url.slice(hashIdx + 1) : url
              navigate(hashPath)
            }
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: 'environment',
          },
        )
        scannerRef.current = scanner
        await scanner.start()
        if (cancelled) {
          scanner.stop()
          return
        }
        setStarting(false)
      } catch (e) {
        if (cancelled) return
        console.warn('QR scanner failed', e)
        setError(t('tradecheck.qr.permissionDenied'))
        setStarting(false)
      }
    })()

    return () => {
      cancelled = true
      scannerRef.current?.stop()
      scannerRef.current?.destroy()
      scannerRef.current = null
    }
  }, [open, onClose, navigate, t])

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="pt-1 pb-2">
        <h2 className="text-lg font-extrabold m-0 mb-3">
          {t('tradecheck.qr.scanTitle')}
        </h2>

        {error ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3">
              {error === t('tradecheck.qr.noCamera') ? (
                <CameraOff size={24} />
              ) : (
                <AlertTriangle size={24} />
              )}
            </div>
            <p className="text-sm text-muted-foreground m-0 mb-4">{error}</p>
            <div className="grid grid-cols-1 gap-2 max-w-xs mx-auto">
              <Button
                icon={<ClipboardPaste size={18} />}
                onClick={() => {
                  onClose()
                  setPasteOpen(true)
                }}
              >
                {t('tradecheck.qr.tryPaste')}
              </Button>
              <Button variant="outline" onClick={onClose}>
                {t('tradecheck.qr.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="aspect-square w-full max-w-sm mx-auto bg-black rounded-2xl overflow-hidden relative">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {starting && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                  …
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              {t('tradecheck.qr.subtitle')}
            </p>
            <Button variant="outline" onClick={onClose} className="mt-3 w-full">
              {t('tradecheck.qr.cancel')}
            </Button>
          </>
        )}
      </div>
      {pasteOpen && (
        <Suspense fallback={null}>
          <PasteSheet open={pasteOpen} onClose={() => setPasteOpen(false)} />
        </Suspense>
      )}
    </BottomSheet>
  )
}

/**
 * The QR encoded data may be a full StickerLog URL, the hash path, or the
 * payload alone. Normalise to a URL we can navigate to.
 */
function parseScanResult(data: string): string | null {
  const trimmed = data.trim()
  if (!trimmed) return null

  // Full URL containing /trade/check/<payload>
  if (/^https?:\/\//i.test(trimmed) && /\/trade\/check\//i.test(trimmed)) {
    return trimmed
  }
  // Hash path "#/trade/check/<payload>"
  if (/^#?\/?trade\/check\//.test(trimmed)) {
    const idx = trimmed.indexOf('/trade/check/')
    return idx >= 0 ? `#${trimmed.slice(idx)}` : null
  }
  // Just the payload
  if (looksLikePayload(trimmed)) {
    return `#/trade/check/${trimmed}`
  }
  return null
}
