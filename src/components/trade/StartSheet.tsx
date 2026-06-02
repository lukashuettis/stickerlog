import { lazy, Suspense, useState } from 'react'
import { QrCode, ClipboardPaste, ChevronRight } from 'lucide-react'
import { BottomSheet } from '../ui/BottomSheet'
import { useT } from '@/i18n/I18nProvider'

const QRScannerSheet = lazy(() =>
  import('./QRScannerSheet').then((m) => ({ default: m.QRScannerSheet })),
)
const PasteSheet = lazy(() =>
  import('./PasteSheet').then((m) => ({ default: m.PasteSheet })),
)

interface StartSheetProps {
  open: boolean
  onClose: () => void
}

/**
 * Bottom sheet that asks the user how the other person's list is reaching
 * them. Two options: scan a QR code (Case 1 — side-by-side users) or paste
 * a link/text (Case 2 — WhatsApp).
 */
export function StartSheet({ open, onClose }: StartSheetProps) {
  const t = useT()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)

  return (
    <>
      <BottomSheet open={open} onClose={onClose}>
        <div className="pt-1 pb-2">
          <h2 className="text-lg font-extrabold m-0 mb-1">
            {t('tradecheck.start.title')}
          </h2>
          <p className="text-xs text-muted-foreground m-0 mb-4">
            {t('tradecheck.start.subtitle')}
          </p>
          <div className="space-y-2">
            <OptionRow
              icon={<QrCode size={22} />}
              title={t('tradecheck.start.scan')}
              hint={t('tradecheck.start.scanHint')}
              onClick={() => {
                onClose()
                setScannerOpen(true)
              }}
            />
            <OptionRow
              icon={<ClipboardPaste size={22} />}
              title={t('tradecheck.start.paste')}
              hint={t('tradecheck.start.pasteHint')}
              onClick={() => {
                onClose()
                setPasteOpen(true)
              }}
            />
          </div>
        </div>
      </BottomSheet>

      {scannerOpen && (
        <Suspense fallback={null}>
          <QRScannerSheet open={scannerOpen} onClose={() => setScannerOpen(false)} />
        </Suspense>
      )}
      {pasteOpen && (
        <Suspense fallback={null}>
          <PasteSheet open={pasteOpen} onClose={() => setPasteOpen(false)} />
        </Suspense>
      )}
    </>
  )
}

function OptionRow({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3.5 bg-card border border-border rounded-xl hover:bg-muted active:scale-[0.99] transition-all text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary-soft-foreground flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />
    </button>
  )
}
