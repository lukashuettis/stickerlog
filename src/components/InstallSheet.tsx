import { Share, Plus, Check } from 'lucide-react'
import { BottomSheet } from './ui/BottomSheet'
import { Button } from './ui/Button'
import { useT } from '@/i18n/I18nProvider'

interface InstallSheetProps {
  open: boolean
  onClose: () => void
}

/**
 * Step-by-step "Add to Home Screen" instructions for iOS Safari.
 * Opened from the SettingsPage install row when on iOS — that row also
 * exists on Chromium where it triggers the native dialog directly, so
 * this sheet is iOS-only.
 */
export function InstallSheet({ open, onClose }: InstallSheetProps) {
  const t = useT()

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="pt-2 pb-2">
        <h2 className="text-lg font-extrabold m-0 mb-1">{t('install.iosSheetTitle')}</h2>
        <p className="text-xs text-muted-foreground m-0 mb-5">{t('install.iosSheetIntro')}</p>

        <ol className="space-y-3.5 m-0 p-0 list-none">
          <Step n={1} icon={<Share size={18} />} text={t('install.iosStep1')} />
          <Step n={2} icon={<Plus size={18} />} text={t('install.iosStep2')} />
          <Step n={3} icon={<Check size={18} />} text={t('install.iosStep3')} />
        </ol>

        <Button onClick={onClose} className="mt-6 w-full">
          {t('install.iosClose')}
        </Button>
      </div>
    </BottomSheet>
  )
}

function Step({ n, icon, text }: { n: number; icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-primary-soft text-primary-soft-foreground flex items-center justify-center flex-shrink-0 text-xs font-extrabold">
        {n}
      </div>
      <div className="flex-1 pt-0.5 text-sm leading-snug flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span>{text}</span>
      </div>
    </li>
  )
}
