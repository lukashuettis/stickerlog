import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { useT } from '@/i18n/I18nProvider'

/**
 * PWA update banner.
 *
 * vite-plugin-pwa registers a service worker that auto-updates in the
 * background. When a new build is available, `needRefresh` flips to `true` —
 * we show a small banner asking the user to reload.
 *
 * We deliberately do NOT auto-reload, because that would discard whatever
 * the user was just typing into a textarea.
 */
export function PWAUpdate() {
  const t = useT()
  const [dismissed, setDismissed] = useState(false)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(err) {
      console.warn('SW register error', err)
    },
  })

  if (!needRefresh || dismissed) return null

  const close = () => {
    setDismissed(true)
    setNeedRefresh(false)
  }

  return (
    <div className="fixed top-4 inset-x-3 lg:left-auto lg:right-6 lg:max-w-sm z-50 animate-fade-in">
      <Card className="p-3.5 flex items-start gap-3 border-primary shadow-token-lg">
        <div className="w-9 h-9 rounded-[10px] bg-primary-soft text-primary-soft-foreground flex items-center justify-center flex-shrink-0">
          <RefreshCw size={18} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">{t('pwa.updateTitle')}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            {t('pwa.updateBody')}
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => updateServiceWorker(true)}>
              {t('pwa.updateAction')}
            </Button>
            <Button size="sm" variant="outline" onClick={close}>
              {t('pwa.updateDismiss')}
            </Button>
          </div>
        </div>
        <button
          onClick={close}
          aria-label={t('common.close')}
          className="text-muted-foreground p-1"
        >
          <X size={16} />
        </button>
      </Card>
    </div>
  )
}
