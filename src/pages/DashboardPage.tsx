import { Link, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { Settings, Plus, Check, X, Euro, TrendingUp, Download } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { StatCard } from '@/components/ui/StatCard'
import { TopBar } from '@/components/ui/TopBar'
import { IconBtn } from '@/components/ui/IconBtn'
import { Flag } from '@/components/ui/Flag'
import {
  useAlbumStats,
  useCostStats,
  useEvents,
  useItems,
  useOwnedMap,
} from '@/hooks/useCollection'
import { ALBUM_TOTAL } from '@/lib/stats'
import { ReleaseNoteBanner } from '@/components/ReleaseNoteBanner'
import { PendingPayloadBanner } from '@/components/PendingPayloadBanner'
import { ALBUM, findStickerByCode } from '@/data/album'
import { NATIONAL_TEAMS, findTeamByCode, teamName } from '@/data/teams'
import { downloadBackup } from '@/lib/backup'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/i18n/I18nProvider'
import { formatEur, formatDate, formatDateLong, relativeShort } from '@/i18n/format'

export function DashboardPage() {
  const stats = useAlbumStats()
  const costs = useCostStats()
  const rawEvents = useEvents()
  const rawItems = useItems()
  const events = useMemo(() => rawEvents ?? [], [rawEvents])
  const items = useMemo(() => rawItems ?? [], [rawItems])
  const owned = useOwnedMap('album')
  const navigate = useNavigate()
  const { show } = useToast()
  const { t, locale, intlLocale } = useI18n()

  const missing = ALBUM_TOTAL - stats.ownedCount
  const lastPurchase = events.find((e) => e.type === 'purchase')

  const recentItems = useMemo(() => {
    return items
      .filter((it) => it.direction === 'in' && it.stickerCatalog === 'album')
      .slice()
      .sort((a, b) => (b.acquiredAt ?? '').localeCompare(a.acquiredAt ?? ''))
      .slice(0, 5)
  }, [items])

  const teamsMini = useMemo(() => {
    return NATIONAL_TEAMS.map((team) => {
      const slots = ALBUM.filter((s) => s.teamCode === team.code)
      const ow = slots.filter((s) => owned[s.id]).length
      return { team, owned: ow, total: slots.length }
    })
      .sort((a, b) => b.owned / b.total - a.owned / a.total)
      .slice(0, 16)
  }, [owned])

  const today = formatDateLong(new Date().toISOString(), intlLocale)

  const relativeStrings = {
    justNow: locale === 'de' ? 'gerade' : 'just now',
    minutesAgo: (n: number) => (locale === 'de' ? `vor ${n} Min` : `${n}m ago`),
    hoursAgo: (n: number) => (locale === 'de' ? `vor ${n} Std` : `${n}h ago`),
    daysAgo: (n: number) => (locale === 'de' ? `vor ${n} T` : `${n}d ago`),
  }

  return (
    <div>
      {/* Mobile top bar */}
      <div className="lg:hidden">
        <TopBar
          large
          title={t('dashboard.titleMobile')}
          subtitle={t('dashboard.subtitle')}
          right={
            <IconBtn
              icon={<Settings size={22} />}
              onClick={() => navigate('/settings')}
              label={t('common.settings')}
            />
          }
        />
      </div>

      {/* Desktop top bar */}
      <div className="hidden lg:flex items-baseline justify-between mb-6 pt-2">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight m-0">
            {t('dashboard.titleDesktop')}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1 m-0">{today}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="md"
            icon={<Download size={16} />}
            onClick={async () => {
              await downloadBackup()
              show(t('settings.backupSaved'))
            }}
          >
            {t('dashboard.exportButton')}
          </Button>
          <Button
            size="md"
            icon={<Plus size={16} strokeWidth={2.5} />}
            onClick={() => navigate('/scan')}
          >
            {t('nav.enter')}
          </Button>
        </div>
      </div>

      {/* Pending shared-list banner — wins if both would render at once.
          A user with a fresh trade-check link to follow up on cares more
          about that than about release notes. */}
      <PendingPayloadBanner />

      {/* Release notes banner — only renders if the user has data and there's
          a version bump since the last visit. Brand-new installs are silently
          aligned (see lib/releaseNotes). */}
      <ReleaseNoteBanner hasCollection={stats.ownedCount > 0} />

      <div className="px-5 pt-2 lg:px-0 lg:pt-0 lg:mb-5">
        <Card className="p-5 lg:p-6 bg-gradient-to-br from-card to-muted">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('dashboard.progressLabelUpper')}
            </span>
            <span className="numeric text-[13px] font-bold text-primary px-2.5 py-1 rounded-full bg-primary-soft">
              {stats.completionPct.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="numeric text-5xl lg:text-6xl font-extrabold tracking-tight leading-none">
              {stats.ownedCount}
            </span>
            <span className="numeric text-xl font-semibold text-muted-foreground">
              / {ALBUM_TOTAL}
            </span>
          </div>
          <Progress value={stats.ownedCount} max={ALBUM_TOTAL} size="lg" />
          <div className="flex justify-between mt-3 text-xs text-muted-foreground">
            <span>{t('dashboard.missingShort', { n: missing })}</span>
            <span>{t('dashboard.packsEstimate', { n: Math.ceil(missing / 7) })}</span>
          </div>
        </Card>
      </div>

      <div className="px-5 pt-3 lg:hidden">
        <Button
          full
          size="lg"
          icon={<Plus size={20} strokeWidth={2.5} />}
          onClick={() => navigate('/scan')}
        >
          {t('nav.enter')}
        </Button>
      </div>

      <div className="px-5 pt-3 grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:px-0 lg:gap-3.5 lg:mb-5">
        <StatCard
          label={t('dashboard.kpiOwned')}
          value={stats.ownedCount}
          sub={t('dashboard.kpiDuplicates', { n: stats.duplicateCount })}
          icon={<Check size={16} strokeWidth={3} />}
          accent="var(--primary)"
        />
        <StatCard
          label={t('dashboard.kpiMissing')}
          value={missing}
          sub={t('dashboard.kpiPacksRemaining', { n: Math.ceil(missing / 7) })}
          icon={<X size={16} strokeWidth={3} />}
        />
        <StatCard
          label={t('dashboard.kpiSpent')}
          value={formatEur(costs.totalSpentCents, intlLocale)}
          sub={t('dashboard.kpiPurchases', { n: costs.purchaseCount })}
          icon={<Euro size={16} strokeWidth={2.5} />}
        />
        <StatCard
          label={t('dashboard.kpiPerNew')}
          value={
            costs.newRegularPaid
              ? formatEur(Math.round(costs.costPerNewCents), intlLocale)
              : '—'
          }
          sub={
            costs.newRegularPaid
              ? t('dashboard.kpiNewCount', { n: costs.newRegularPaid })
              : t('dashboard.kpiNoneYet')
          }
          icon={<TrendingUp size={16} />}
        />
      </div>

      {/* Desktop: 2-col block */}
      <div className="hidden lg:grid lg:grid-cols-[1.6fr_1fr] lg:gap-3.5">
        <Card className="p-5">
          <div className="flex justify-between mb-3.5">
            <h3 className="text-sm font-bold m-0">{t('dashboard.teamsSection')}</h3>
            <Link to="/teams" className="text-xs font-bold text-primary">
              {t('dashboard.linkAllTeams')}
            </Link>
          </div>
          <div className="grid grid-cols-8 gap-2.5">
            {teamsMini.map(({ team, owned: ow, total }) => {
              const complete = ow === total
              return (
                <Link
                  key={team.code}
                  to={`/teams/${team.code}`}
                  className={
                    'flex flex-col items-center gap-1.5 p-2 rounded-lg ' +
                    (complete
                      ? 'border border-primary shadow-[0_0_0_1px_var(--primary),0_4px_12px_-4px_rgba(34,197,94,0.25)]'
                      : 'border border-transparent hover:bg-muted/50')
                  }
                >
                  <Flag team={team} size={32} />
                  <div className="text-[9px] font-bold text-center truncate w-full">
                    {team.code}
                  </div>
                  <div className="w-full">
                    <Progress value={ow} max={total} size="sm" />
                  </div>
                  <div className="numeric text-[9px] font-semibold text-muted-foreground">
                    {ow}/{total}
                  </div>
                </Link>
              )
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold m-0 mb-3">{t('dashboard.activitySection')}</h3>
          {recentItems.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">
              {t('dashboard.recentEmpty')}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {recentItems.map((item) => {
                const slot = findStickerByCode(item.stickerId)
                const team = slot ? findTeamByCode(slot.teamCode) : undefined
                return (
                  <Link
                    key={item.id}
                    to={team ? `/teams/${team.code}` : '/teams'}
                    className="flex items-center gap-2.5"
                  >
                    {team && <Flag team={team} size={28} />}
                    <div className="flex-1 text-xs">
                      <div className="font-semibold">
                        {team ? teamName(team, locale) : t('teams.title')}{' '}
                        <span className="numeric text-muted-foreground">· {item.stickerId}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {relativeShort(item.acquiredAt, intlLocale, relativeStrings)}
                        {!item.wasNew && ' · ' + t('dashboard.recentDuplicate')}
                      </div>
                    </div>
                    <span
                      className={
                        'text-[10px] font-bold px-2 py-0.5 rounded-md ' +
                        (item.wasNew
                          ? 'bg-primary-soft text-primary-soft-foreground'
                          : 'bg-muted text-muted-foreground')
                      }
                    >
                      {item.wasNew ? t('dashboard.activityBadgeNew') : t('dashboard.activityBadgeDup')}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Mobile: stacked */}
      <div className="lg:hidden">
        {lastPurchase && (
          <div className="px-5 pt-3.5">
            <Card className="p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-primary-soft text-primary-soft-foreground flex items-center justify-center flex-shrink-0">
                <Plus size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-muted-foreground">
                  {lastPurchase.store
                    ? t('dashboard.lastPurchaseLabelStore', { store: lastPurchase.store })
                    : t('dashboard.lastPurchaseLabel')}
                </div>
                <div className="text-sm font-bold mt-0.5 numeric">
                  {formatEur(lastPurchase.priceCents ?? 0, intlLocale)} ·{' '}
                  <span className="text-muted-foreground">
                    {formatDate(lastPurchase.occurredAt, intlLocale)}
                  </span>
                </div>
              </div>
              <Link to="/packs" className="text-primary text-[13px] font-bold">
                {t('dashboard.linkAll')}
              </Link>
            </Card>
          </div>
        )}

        {recentItems.length > 0 && (
          <div className="px-5 pt-4">
            <div className="text-[13px] font-bold text-muted-foreground mb-2 pl-1">
              {t('dashboard.recentTitle')}
            </div>
            <Card padded={false} className="overflow-hidden">
              {recentItems.slice(0, 4).map((item, i) => {
                const slot = findStickerByCode(item.stickerId)
                const team = slot ? findTeamByCode(slot.teamCode) : undefined
                return (
                  <Link
                    key={item.id}
                    to={team ? `/teams/${team.code}` : '/teams'}
                    className={
                      'flex items-center gap-3 px-3.5 py-2.5 ' +
                      (i < Math.min(recentItems.length, 4) - 1 ? 'border-b border-border' : '')
                    }
                  >
                    {team ? (
                      <Flag team={team} size={32} />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold numeric">{item.stickerId}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {team ? teamName(team, locale) : t('teams.title')}
                        {!item.wasNew && ' · ' + t('dashboard.recentDuplicate')}
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {relativeShort(item.acquiredAt, intlLocale, relativeStrings)}
                    </div>
                  </Link>
                )
              })}
            </Card>
          </div>
        )}

        {!lastPurchase && stats.ownedCount === 0 && (
          <div className="px-5 pt-5">
            <Card className="p-5 text-center">
              <div className="text-base font-bold mb-1">{t('dashboard.emptyTitle')}</div>
              <p className="text-sm text-muted-foreground mb-3">{t('dashboard.emptyBody')}</p>
              <Button onClick={() => navigate('/scan')} size="lg" icon={<Plus size={18} />}>
                {t('dashboard.emptyCta')}
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
