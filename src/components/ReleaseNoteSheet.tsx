import { Sparkles, Check, X } from 'lucide-react'
import { BottomSheet } from './ui/BottomSheet'
import { Button } from './ui/Button'
import { useT, useI18n } from '@/i18n/I18nProvider'
import { LATEST_RELEASE } from '@/data/releaseNotes'
import { formatDateLong } from '@/i18n/format'

interface ReleaseNoteSheetProps {
  open: boolean
  onClose: () => void
  /** Called when the user explicitly confirms — used to persist seen-state. */
  onConfirm: () => void
}

/**
 * Bottom sheet with the structured highlights of the latest release. Plain
 * text via i18n keys — no fancy media. Closing via "Verstanden" or the X
 * persists the seen-state; tapping outside just dismisses without persisting
 * (the banner stays so the user can come back to it).
 */
export function ReleaseNoteSheet({ open, onClose, onConfirm }: ReleaseNoteSheetProps) {
  const t = useT()
  const { locale } = useI18n()
  const release = LATEST_RELEASE
  const intlLocale = locale === 'de' ? 'de-DE' : 'en-US'

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="pt-1 pb-3">
        <div className="flex items-start gap-3 mb-1">
          <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary-soft-foreground flex items-center justify-center flex-shrink-0">
            <Sparkles size={22} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold m-0 leading-tight">
              {t(release.titleKey)}
            </h2>
            <p className="text-xs text-muted-foreground m-0 mt-0.5">
              v{release.version} · {formatDateLong(release.date, intlLocale)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="text-muted-foreground p-1 bg-transparent border-none"
          >
            <X size={18} />
          </button>
        </div>

        <ul className="m-0 p-0 list-none space-y-2.5 mt-4">
          {release.highlights.map((key) => (
            <li key={key} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check size={11} strokeWidth={4} />
              </div>
              <span className="text-sm leading-snug flex-1">{t(key)}</span>
            </li>
          ))}
        </ul>

        <Button onClick={onConfirm} className="mt-5 w-full">
          {t('rn.sheet.gotIt')}
        </Button>
      </div>
    </BottomSheet>
  )
}
