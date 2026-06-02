import { useMemo, useState } from 'react'
import { FileText, MoreHorizontal, HandHeart } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TopBar } from '@/components/ui/TopBar'
import { Flag } from '@/components/ui/Flag'
import { useToast } from '@/components/ui/Toast'
import { useOwnedMap } from '@/hooks/useCollection'
import { ALBUM } from '@/data/album'
import { findTeamByCode, TEAMS, teamName } from '@/data/teams'
import {
  downloadBlob,
  generateCsv,
  type SeekOfferLists,
  type TradeListGroup,
} from '@/lib/export'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/cn'
import { TauschCheckCard } from '@/components/trade/TauschCheckCard'
import { RecentTrades } from '@/components/trade/RecentTrades'
import { GiveAwaySheet } from '@/components/trade/GiveAwaySheet'
import { PendingPayloadHint } from '@/components/PendingPayloadHint'

type Tab = 'seek' | 'offer'

export function TradePage() {
  const owned = useOwnedMap('album')
  const { show } = useToast()
  const { t, locale } = useI18n()
  const [tab, setTab] = useState<Tab>('seek')

  const lists = useMemo<SeekOfferLists>(() => {
    const seekByTeam = new Map<string, TradeListGroup>()
    const offerByTeam = new Map<string, TradeListGroup & { dupCounts: Map<string, number> }>()

    for (const slot of ALBUM) {
      const team = findTeamByCode(slot.teamCode) ?? TEAMS[TEAMS.length - 1]
      const count = owned[slot.id] ?? 0
      if (count === 0) {
        if (!seekByTeam.has(slot.teamCode)) {
          seekByTeam.set(slot.teamCode, { team, items: [] })
        }
        seekByTeam.get(slot.teamCode)!.items.push(slot)
      }
      if (count > 1) {
        if (!offerByTeam.has(slot.teamCode)) {
          offerByTeam.set(slot.teamCode, { team, items: [], dupCounts: new Map() })
        }
        const group = offerByTeam.get(slot.teamCode)!
        group.items.push(slot)
        group.dupCounts.set(slot.id, count - 1)
      }
    }

    const seek = Array.from(seekByTeam.values()).sort((a, b) => b.items.length - a.items.length)
    const offer = Array.from(offerByTeam.values()).sort(
      (a, b) => b.items.length - a.items.length,
    )
    const totalSeek = seek.reduce((s, g) => s + g.items.length, 0)
    const totalOffer = offer.reduce((s, g) => s + g.items.length, 0)
    return { seek, offer, totalSeek, totalOffer }
  }, [owned])

  const activeGroups: Array<TradeListGroup & { dupCounts?: Map<string, number> }> =
    tab === 'seek' ? lists.seek : lists.offer

  const [moreOpen, setMoreOpen] = useState(false)
  const [giveOpen, setGiveOpen] = useState(false)

  const handleDownloadCsv = () => {
    const csv = generateCsv(lists)
    const filename = `sticker-trade-${new Date().toISOString().slice(0, 10)}.csv`
    downloadBlob(csv, filename, 'text/csv')
    show(t('trade.csvDownloaded'))
    setMoreOpen(false)
  }

  return (
    <div className="pb-32">
      <TopBar large title={t('trade.title')} subtitle={t('trade.subtitle')} />

      {/* Pending re-entry hint — shows if a shared list is still waiting */}
      <PendingPayloadHint />

      {/* Signature: Tausch-Check card */}
      <div className="pt-1 pb-3">
        <TauschCheckCard lists={lists} />
      </div>

      {/* Tab switcher */}
      <div className="px-5">
        <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-xl">
          {[
            { id: 'seek' as const, label: t('trade.tabSeek'), count: lists.totalSeek, dot: '#ef4444' },
            { id: 'offer' as const, label: t('trade.tabOffer'), count: lists.totalOffer, dot: '#22c55e' },
          ].map((tab2) => (
            <button
              key={tab2.id}
              onClick={() => setTab(tab2.id)}
              className={cn(
                'h-11 rounded-[9px] text-sm font-bold flex items-center justify-center gap-2 transition-colors',
                tab === tab2.id
                  ? 'bg-card text-foreground shadow-token-sm'
                  : 'bg-transparent text-muted-foreground',
              )}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: tab2.dot }} />
              {tab2.label}
              <span
                className={cn(
                  'numeric text-[11px] font-bold px-1.5 py-0.5 rounded-full text-muted-foreground',
                  tab === tab2.id ? 'bg-muted' : 'bg-card',
                )}
              >
                {tab2.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-5 pt-3.5 flex flex-col gap-2.5">
        {activeGroups.slice(0, 8).map((g) => (
          <Card key={g.team.code} padded={false} className="overflow-hidden">
            <div className="flex items-center gap-3 p-3.5 bg-muted border-b border-border">
              <Flag team={g.team} size={32} />
              <div className="flex-1 text-sm font-bold">{teamName(g.team, locale)}</div>
              <div className="numeric text-xs font-bold text-muted-foreground">
                {g.items.length}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 p-3">
              {g.items.slice(0, 12).map((s) => {
                const dup = g.dupCounts?.get(s.id) ?? 0
                return (
                  <span
                    key={s.id}
                    className={cn(
                      'numeric text-xs font-bold px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 border',
                      tab === 'seek'
                        ? 'bg-destructive/10 text-destructive border-destructive/20'
                        : 'bg-primary-soft text-primary-soft-foreground border-primary/30',
                    )}
                  >
                    {s.id}
                    {dup > 0 && <span className="opacity-70">×{dup}</span>}
                  </span>
                )
              })}
              {g.items.length > 12 && (
                <span className="text-xs font-semibold text-muted-foreground px-1 py-1.5">
                  {t('trade.moreCount', { n: g.items.length - 12 })}
                </span>
              )}
            </div>
          </Card>
        ))}

        {activeGroups.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            {tab === 'seek' ? t('trade.emptySeek') : t('trade.emptyOffer')}
          </Card>
        )}
      </div>

      {/* Recent trades preview + secondary actions */}
      <div className="pt-4 space-y-4">
        <RecentTrades />

        <div className="px-5 lg:px-0 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="md"
            icon={<HandHeart size={16} />}
            onClick={() => setGiveOpen(true)}
          >
            {t('give.cta')}
          </Button>
          <Button
            variant="ghost"
            size="md"
            icon={<MoreHorizontal size={16} />}
            onClick={() => setMoreOpen((v) => !v)}
          >
            {t('trade.more')}
          </Button>
        </div>

        {moreOpen && (
          <div className="px-5 lg:px-0">
            <Card padded={false} className="overflow-hidden">
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted"
              >
                <FileText size={18} className="text-muted-foreground" />
                <span className="text-sm font-semibold">{t('trade.moreCsv')}</span>
              </button>
            </Card>
          </div>
        )}
      </div>

      <GiveAwaySheet open={giveOpen} onClose={() => setGiveOpen(false)} />
    </div>
  )
}
