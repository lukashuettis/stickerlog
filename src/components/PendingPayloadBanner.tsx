import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox, X } from 'lucide-react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { useT } from '@/i18n/I18nProvider'
import {
  getPendingPayload,
  dismissPendingForSession,
  isPendingDismissedThisSession,
} from '@/lib/pendingPayload'

/**
 * Dashboard banner reminding a user that they opened a shared trade list
 * before they had any collection data, and that the link is still saved.
 *
 * - Visible whenever a pending payload exists and the user hasn't tapped
 *   "Später" this session.
 * - "Jetzt abgleichen" → opens /trade/check/<payload>
 * - "Später" → dismisses only for the current session; the payload itself
 *   stays for up to 30 days so the user can find it again from TradePage.
 */
export function PendingPayloadBanner() {
  const t = useT()
  const navigate = useNavigate()
  // Snapshot once on mount so we don't pop in mid-session after dismiss.
  const [visible, setVisible] = useState(
    () => Boolean(getPendingPayload()) && !isPendingDismissedThisSession(),
  )

  if (!visible) return null

  const payload = getPendingPayload()
  if (!payload) return null

  const dismiss = () => {
    dismissPendingForSession()
    setVisible(false)
  }
  const open = () => {
    setVisible(false)
    navigate(`/trade/check/${payload}`)
  }

  return (
    <div className="px-5 lg:px-0 pt-1">
      <Card className="p-3.5 border-primary border bg-primary-soft/30">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
            <Inbox size={18} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold leading-tight">
              {t('tradecheck.pending.bannerTitle')}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              {t('tradecheck.pending.bannerBody')}
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t('common.close')}
            className="text-muted-foreground p-1 bg-transparent border-none"
          >
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={dismiss}>
            {t('tradecheck.pending.bannerLater')}
          </Button>
          <Button size="sm" onClick={open}>
            {t('tradecheck.pending.bannerNow')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
