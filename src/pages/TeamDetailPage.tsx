import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowLeftRight } from 'lucide-react'
import { TopBar } from '@/components/ui/TopBar'
import { IconBtn } from '@/components/ui/IconBtn'
import { Card } from '@/components/ui/Card'
import { Flag } from '@/components/ui/Flag'
import { Progress } from '@/components/ui/Progress'
import { Button } from '@/components/ui/Button'
import { StickerTile } from '@/components/ui/StickerTile'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useToast } from '@/components/ui/Toast'
import { useOwnedMap } from '@/hooks/useCollection'
import { findTeamByCode, teamName } from '@/data/teams'
import { getStickersForTeam } from '@/data/album'
import { addOneCorrection, removeOneCorrection } from '@/lib/db'
import { StickerHistorySheet } from './StickerHistorySheet'
import type { AlbumSlot } from '@/lib/types'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n/I18nProvider'

export function TeamDetailPage() {
  const { code = 'GER' } = useParams()
  const team = findTeamByCode(code)
  const navigate = useNavigate()
  const owned = useOwnedMap('album')
  const { show } = useToast()
  const { t, locale } = useI18n()
  const [sheetSticker, setSheetSticker] = useState<AlbumSlot | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const stickers = useMemo(() => (team ? getStickersForTeam(team.code) : []), [team])

  if (!team) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        Team „{code}" nicht gefunden.
      </div>
    )
  }

  const ownedCount = stickers.filter((s) => owned[s.id]).length
  const dupCount = stickers.filter((s) => (owned[s.id] ?? 0) > 1).length
  const pct = stickers.length ? (ownedCount / stickers.length) * 100 : 0
  const currentCount = sheetSticker ? owned[sheetSticker.id] ?? 0 : 0

  const handlePlus = async () => {
    if (!sheetSticker) return
    await addOneCorrection('album', sheetSticker.id)
    show(t('toast.stickerAdded', { id: sheetSticker.id }))
  }

  const handleMinus = async () => {
    if (!sheetSticker || currentCount === 0) return
    await removeOneCorrection('album', sheetSticker.id)
    if (currentCount - 1 === 0) show(t('toast.stickerRemoved', { id: sheetSticker.id }))
  }

  const localTeamName = teamName(team, locale)

  return (
    <div>
      <TopBar
        title={localTeamName}
        left={
          <IconBtn
            icon={<ArrowLeft size={22} />}
            onClick={() => navigate('/teams')}
            label={t('common.back')}
          />
        }
      />

      <div className="px-5 pt-2">
        <Card className="p-4 flex items-center gap-4">
          <Flag team={team} size={64} />
          <div className="flex-1">
            <div className="text-xl font-extrabold tracking-tight">{localTeamName}</div>
            <div className="numeric text-[13px] text-muted-foreground mt-0.5">
              {ownedCount}/{stickers.length} · {pct.toFixed(0)}%
              {dupCount > 0 && ' · ' + t('teamDetail.duplicatesNCount', { n: dupCount })}
            </div>
            <div className="mt-2">
              <Progress value={ownedCount} max={stickers.length} />
            </div>
          </div>
        </Card>
      </div>

      <div className="px-5 pt-4">
        <div className="text-xs text-muted-foreground mb-2 font-medium">
          {t('teamDetail.hint')}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {stickers.map((s) => (
            <StickerTile
              key={s.id}
              sticker={s}
              count={owned[s.id] ?? 0}
              onTap={() => setSheetSticker(s)}
              onLong={async () => {
                await addOneCorrection('album', s.id)
                show(t('toast.stickerPlusOne', { id: s.id }), 'info')
              }}
            />
          ))}
        </div>
      </div>

      <div className="px-5 pt-5 flex gap-2.5">
        <Button
          variant="outline"
          full
          icon={<ArrowLeftRight size={18} />}
          onClick={() => navigate('/trade')}
        >
          {t('teamDetail.toTradeList')}
        </Button>
      </div>

      <BottomSheet open={!!sheetSticker && !historyOpen} onClose={() => setSheetSticker(null)}>
        {sheetSticker && (
          <>
            <div className="flex items-center gap-3.5 mb-5">
              <Flag team={team} size={56} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="numeric text-lg font-extrabold">{sheetSticker.id}</span>
                  <span className="numeric text-xs text-muted-foreground">
                    #{sheetSticker.n}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {sheetSticker.playerName ?? localTeamName}
                </div>
              </div>
              <span
                className={cn(
                  'text-[11px] font-bold px-2.5 py-1 rounded-full',
                  currentCount === 0 && 'bg-muted text-muted-foreground',
                  currentCount === 1 && 'bg-primary-soft text-primary-soft-foreground',
                  currentCount > 1 && 'bg-primary text-white',
                )}
              >
                {currentCount === 0
                  ? t('teamDetail.statusMissing')
                  : currentCount === 1
                    ? t('teamDetail.statusOwned')
                    : `×${currentCount}`}
              </span>
            </div>

            <div className="flex items-center gap-4 p-2 bg-muted rounded-2xl mb-3.5">
              <button
                onClick={handleMinus}
                disabled={currentCount === 0}
                className={cn(
                  'w-14 h-14 rounded-xl bg-card text-foreground text-3xl font-light',
                  'flex items-center justify-center shadow-token-sm',
                  currentCount === 0 && 'opacity-40 cursor-not-allowed',
                )}
              >
                −
              </button>
              <div className="flex-1 text-center">
                <div className="numeric text-[44px] font-extrabold leading-none tracking-tight">
                  {currentCount}
                </div>
                <div className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                  {currentCount === 0
                    ? t('teamDetail.notInAlbum')
                    : currentCount === 1
                      ? t('teamDetail.onceOwned')
                      : t('teamDetail.duplicatesNCount', { n: currentCount - 1 })}
                </div>
              </div>
              <button
                onClick={handlePlus}
                className="w-14 h-14 rounded-xl bg-primary text-white text-3xl font-light flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(34,197,94,0.5)]"
              >
                +
              </button>
            </div>

            <div className="flex gap-2">
              <Button full variant="outline" onClick={() => setHistoryOpen(true)}>
                {t('teamDetail.history')}
              </Button>
              <Button full size="md" variant="outline" onClick={() => setSheetSticker(null)}>
                {t('common.done')}
              </Button>
            </div>
          </>
        )}
      </BottomSheet>

      <StickerHistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        sticker={sheetSticker}
        team={team}
      />
    </div>
  )
}
