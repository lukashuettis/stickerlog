import { useState } from 'react'
import { Repeat, Share2 } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { StartSheet } from './StartSheet'
import { ShareSheet } from './ShareSheet'
import { useT } from '@/i18n/I18nProvider'
import type { SeekOfferLists } from '@/lib/export'

interface TauschCheckCardProps {
  lists: SeekOfferLists
}

/**
 * The signature feature card that sits on top of TradePage. Two CTAs only:
 * "Tausch-Check starten" (consume an incoming list) and "Meine Liste teilen"
 * (broadcast my own). Both open a bottom-sheet with platform-specific
 * options.
 */
export function TauschCheckCard({ lists }: TauschCheckCardProps) {
  const t = useT()
  const [startOpen, setStartOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  return (
    <>
      <Card className="p-4 border-primary border-2 bg-primary-soft/30 mx-5 lg:mx-0">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
            <Repeat size={22} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-extrabold m-0 leading-tight">
              {t('tradecheck.card.title')}
            </h3>
            <p className="text-xs text-muted-foreground m-0 mt-0.5 leading-snug">
              {t('tradecheck.card.body')}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Button size="md" onClick={() => setStartOpen(true)}>
            {t('tradecheck.card.start')}
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={<Share2 size={16} />}
            onClick={() => setShareOpen(true)}
          >
            {t('tradecheck.card.share')}
          </Button>
        </div>
      </Card>

      <StartSheet open={startOpen} onClose={() => setStartOpen(false)} />
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        lists={lists}
      />
    </>
  )
}
