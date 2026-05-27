import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Euro,
  Plus,
  TrendingUp,
  Sparkles,
  Gift,
  ArrowLeftRight,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { TopBar } from '@/components/ui/TopBar'
import { IconBtn } from '@/components/ui/IconBtn'
import { StatCard } from '@/components/ui/StatCard'
import { Progress } from '@/components/ui/Progress'
import { useCostStats, useEvents, useItems } from '@/hooks/useCollection'
import { aggregateSideCounts, hitRatePerTemplate } from '@/lib/cost'
import { cumulativeSpend } from '@/lib/stats'
import { getProductTemplate, productNameKey } from '@/data/product-templates'
import { useI18n } from '@/i18n/I18nProvider'
import { formatEur } from '@/i18n/format'
import type { MessageKey } from '@/i18n/messages'

export function StatsPage() {
  const navigate = useNavigate()
  const { t, intlLocale } = useI18n()
  const stats = useCostStats()
  const rawEvents = useEvents()
  const rawItems = useItems()
  const events = useMemo(() => rawEvents ?? [], [rawEvents])
  const items = useMemo(() => rawItems ?? [], [rawItems])

  const sideCounts = useMemo(() => aggregateSideCounts(events, items), [events, items])
  const tplStats = useMemo(() => hitRatePerTemplate(events, items), [events, items])
  const spend = useMemo(() => cumulativeSpend(events), [events])

  const noPurchases = stats.purchaseCount === 0

  return (
    <div>
      <TopBar
        large
        title={t('stats.title')}
        subtitle={t('stats.subtitle')}
        left={
          <IconBtn
            icon={<ArrowLeft size={22} />}
            onClick={() => navigate('/')}
            label={t('common.back')}
          />
        }
      />

      <div className="px-5 grid grid-cols-2 gap-2.5">
        <StatCard
          label={t('stats.kpiSpent')}
          value={formatEur(stats.totalSpentCents, intlLocale)}
          sub={t('stats.kpiPurchases', { n: stats.purchaseCount })}
          icon={<Euro size={16} />}
          accent="var(--primary)"
        />
        <StatCard
          label={t('stats.kpiNewStickers')}
          value={stats.newRegularPaid}
          sub={t('stats.kpiFromPacks')}
          icon={<Plus size={16} strokeWidth={3} />}
        />
        <StatCard
          label={t('stats.kpiHitRate')}
          value={`${(stats.hitRate * 100).toFixed(0)}%`}
          sub={stats.openedRegularPaid ? t('stats.kpiOpened', { n: stats.openedRegularPaid }) : '—'}
          icon={<Sparkles size={16} />}
        />
        <StatCard
          label={t('stats.kpiPerNew')}
          value={
            stats.newRegularPaid
              ? formatEur(Math.round(stats.costPerNewCents), intlLocale)
              : '—'
          }
          sub={
            stats.openedRegularPaid
              ? t('stats.kpiCostPerSticker', {
                  price: formatEur(Math.round(stats.costPerOpenedCents), intlLocale),
                })
              : t('stats.kpiNoneYet')
          }
          icon={<TrendingUp size={16} />}
        />
      </div>

      {spend.length > 0 && (
        <div className="px-5 pt-5">
          <Card className="p-4">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <div className="text-sm font-bold">{t('stats.spendChartTitle')}</div>
                <div className="text-xs text-muted-foreground">{t('stats.spendChartSub')}</div>
              </div>
              <div className="numeric text-lg font-extrabold text-primary">
                {formatEur(stats.totalSpentCents, intlLocale)}
              </div>
            </div>
            <LineChart points={spend} />
          </Card>
        </div>
      )}

      {tplStats.length > 0 && (
        <div className="px-5 pt-4">
          <Card className="p-4">
            <div className="mb-3.5">
              <div className="text-sm font-bold">{t('stats.hitRatePerProduct')}</div>
              <div className="text-xs text-muted-foreground">{t('stats.hitRatePerProductDesc')}</div>
            </div>
            <div className="flex flex-col gap-2.5">
              {tplStats.map((row) => {
                const name = getProductTemplate(row.productTemplateId)
                  ? t(productNameKey(row.productTemplateId) as MessageKey)
                  : row.productTemplateId
                return (
                  <div key={row.productTemplateId}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[13px] font-semibold">
                        {name}{' '}
                        <span className="text-muted-foreground font-normal">
                          · {t('stats.purchaseCountTimes', { n: row.purchases })}
                        </span>
                      </span>
                      <span className="numeric text-xs font-bold text-muted-foreground">
                        {(row.rate * 100).toFixed(0)}% · {row.newOnes}/{row.opened}
                      </span>
                    </div>
                    <Progress
                      value={row.rate * 100}
                      color={
                        row.rate > 0.7
                          ? 'var(--primary)'
                          : row.rate > 0.5
                            ? 'var(--warning)'
                            : 'var(--muted-foreground)'
                      }
                    />
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {(sideCounts.tradeIn > 0 ||
        sideCounts.tradeOut > 0 ||
        sideCounts.giftIn > 0 ||
        sideCounts.bonusIn > 0 ||
        sideCounts.correctionIn > 0) && (
        <div className="px-5 pt-4">
          <Card className="p-4">
            <div className="text-sm font-bold mb-3">{t('stats.sideStickers')}</div>
            <div className="text-xs text-muted-foreground mb-3">
              {t('stats.sideStickersDesc')}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {sideCounts.tradeIn + sideCounts.tradeOut > 0 && (
                <SideStat
                  icon={<ArrowLeftRight size={16} />}
                  label={t('stats.sideTrade')}
                  value={`+${sideCounts.tradeIn} / −${sideCounts.tradeOut}`}
                />
              )}
              {sideCounts.giftIn > 0 && (
                <SideStat
                  icon={<Gift size={16} />}
                  label={t('stats.sideGift')}
                  value={`${sideCounts.giftIn}`}
                />
              )}
              {sideCounts.bonusIn > 0 && (
                <SideStat
                  icon={<Sparkles size={16} />}
                  label={t('stats.sideBonus')}
                  value={`${sideCounts.bonusIn}`}
                />
              )}
              {sideCounts.correctionIn > 0 && (
                <SideStat
                  icon={<Plus size={16} />}
                  label={t('stats.sideCorrection')}
                  value={`${sideCounts.correctionIn}`}
                />
              )}
            </div>
          </Card>
        </div>
      )}

      {!noPurchases && (
        <div className="px-5 pt-4">
          <details className="rounded-2xl bg-muted">
            <summary className="px-4 py-3 text-sm font-semibold cursor-pointer">
              {t('stats.detailsToggle')}
            </summary>
            <div className="px-4 pb-4 text-[13px] flex flex-col gap-1.5 text-muted-foreground">
              <Detail label={t('stats.detailOpenedCount')} value={String(stats.openedRegularPaid)} />
              <Detail label={t('stats.detailNew')} value={String(stats.newRegularPaid)} />
              <Detail
                label={t('stats.detailAllocatedCost')}
                value={formatEur(Math.round(stats.allocatedOpenedCents), intlLocale)}
              />
              <Detail
                label={t('stats.detailCostPerOpened')}
                value={
                  stats.openedRegularPaid
                    ? formatEur(Math.round(stats.costPerOpenedCents), intlLocale)
                    : '—'
                }
              />
            </div>
          </details>
        </div>
      )}

      {noPurchases && (
        <div className="px-5 pt-6 text-center text-sm text-muted-foreground">
          {t('stats.noPurchases')}
        </div>
      )}
    </div>
  )
}

function SideStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-muted-foreground">{label}</div>
        <div className="text-sm font-bold numeric">{value}</div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="numeric font-semibold text-foreground">{value}</span>
    </div>
  )
}

interface ChartPoint {
  date: string
  cents: number
}

function LineChart({ points }: { points: ChartPoint[] }) {
  if (!points.length) return null
  const W = 320
  const H = 120
  const P = 8
  const maxV = Math.max(...points.map((p) => p.cents))
  const xs = points.map((_, i) => P + (i / Math.max(points.length - 1, 1)) * (W - P * 2))
  const ys = points.map((p) => H - P - (p.cents / maxV) * (H - P * 2))
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ')
  const area = `${path} L ${xs[xs.length - 1]} ${H - P} L ${xs[0]} ${H - P} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[120px] block">
      <defs>
        <linearGradient id="spendFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
        <line
          key={tick}
          x1={P}
          x2={W - P}
          y1={P + tick * (H - P * 2)}
          y2={P + tick * (H - P * 2)}
          stroke="var(--border)"
          strokeWidth="0.5"
        />
      ))}
      <path d={area} fill="url(#spendFill)" />
      <path
        d={path}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="3" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
      ))}
    </svg>
  )
}
