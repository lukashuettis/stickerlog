import { useEffect, useState } from 'react'
import { Plus, Share, X } from 'lucide-react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { shouldShowIOSInstallHint } from '@/lib/ios-pwa'
import { db } from '@/lib/db'
import { useT } from '@/i18n/I18nProvider'

const STORAGE_KEY = 'iosInstallHintDismissedAt'
const REMIND_AFTER_DAYS = 14

type Status = 'loading' | 'hidden' | 'visible'

/**
 * iOS-only banner that nudges the user to install the PWA before entering data.
 * Background: Safari isolates tab-storage from PWA-storage, so data entered
 * in the tab is lost when the PWA is later installed.
 */
export function IOSInstallHint() {
  const [status, setStatus] = useState<Status>('loading')
  const [hasData, setHasData] = useState(false)
  const t = useT()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!shouldShowIOSInstallHint()) {
        if (!cancelled) setStatus('hidden')
        return
      }
      const dismissed = localStorage.getItem(STORAGE_KEY)
      if (dismissed) {
        const days = (Date.now() - new Date(dismissed).getTime()) / (1000 * 60 * 60 * 24)
        if (days < REMIND_AFTER_DAYS) {
          if (!cancelled) setStatus('hidden')
          return
        }
      }
      // Count user data across both legacy (v1) and current (v2) stores so the
      // wording stays accurate after the v2 migration.
      const [itemCount, legacyCount] = await Promise.all([
        db.items.count(),
        db.album.count(),
      ])
      if (cancelled) return
      setHasData(itemCount + legacyCount > 0)
      setStatus('visible')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString())
    setStatus('hidden')
  }

  if (status !== 'visible') return null

  return (
    <div className="fixed top-4 inset-x-3 z-40 animate-fade-in">
      <Card className="p-3.5 flex items-start gap-3 border-primary shadow-token-lg">
        <div className="w-9 h-9 rounded-[10px] bg-primary-soft text-primary-soft-foreground flex items-center justify-center flex-shrink-0">
          <Plus size={18} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">
            {hasData ? t('iosHint.titleWithData') : t('iosHint.titleNew')}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug flex items-center gap-1 flex-wrap">
            <Share size={11} className="inline -mt-0.5" />
            <span>{t('iosHint.body')}</span>
          </div>
          <Button size="sm" className="mt-2" onClick={dismiss}>
            {t('iosHint.cta')}
          </Button>
        </div>
        <button
          onClick={dismiss}
          aria-label={t('iosHint.dismiss')}
          className="text-muted-foreground p-1"
        >
          <X size={16} />
        </button>
      </Card>
    </div>
  )
}
