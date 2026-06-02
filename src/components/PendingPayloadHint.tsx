import { useNavigate } from 'react-router-dom'
import { Inbox, ChevronRight } from 'lucide-react'
import { Card } from './ui/Card'
import { useT } from '@/i18n/I18nProvider'
import { getPendingPayload } from '@/lib/pendingPayload'

/**
 * Sober re-entry hint on the TradePage so a user who tapped "Später" on the
 * Dashboard banner can still find the pending list. Always visible while a
 * pending payload exists — no session-dismiss here, because this IS the
 * re-entry point.
 */
export function PendingPayloadHint() {
  const t = useT()
  const navigate = useNavigate()
  const payload = getPendingPayload()
  if (!payload) return null

  return (
    <div className="px-5 lg:px-0 pt-2">
      <button
        type="button"
        onClick={() => navigate(`/trade/check/${payload}`)}
        className="w-full bg-transparent border-none p-0 text-left"
      >
        <Card className="p-3 flex items-center gap-3 border border-primary/40 bg-primary-soft/20">
          <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary-soft-foreground flex items-center justify-center flex-shrink-0">
            <Inbox size={16} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold leading-tight">
              {t('tradecheck.pending.tradeHintTitle')}
            </div>
            <div className="text-[11px] text-primary font-semibold mt-0.5">
              {t('tradecheck.pending.tradeHintCta')}
            </div>
          </div>
          <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
        </Card>
      </button>
    </div>
  )
}
