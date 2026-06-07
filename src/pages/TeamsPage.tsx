import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Check } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Chip } from '@/components/ui/Chip'
import { Flag } from '@/components/ui/Flag'
import { Progress } from '@/components/ui/Progress'
import { TopBar } from '@/components/ui/TopBar'
import { useOwnedMap } from '@/hooks/useCollection'
import { TEAMS, teamName } from '@/data/teams'
import { ALBUM } from '@/data/album'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n/I18nProvider'

type Filter = 'all' | 'complete' | 'inprogress' | 'empty'
type Sort = 'group' | 'alpha'

export function TeamsPage() {
  const owned = useOwnedMap()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('group')
  const navigate = useNavigate()
  const { t, locale } = useI18n()

  // Build per-team progress from ALBUM. Uses the full TEAMS list (includes
  // the FWC pseudo-team that holds the 20 cover/intro/museum specials) so
  // they show up in the picker just like national teams.
  const teamsWithProgress = useMemo(() => {
    return TEAMS.map((team) => {
      const stickers = ALBUM.filter((s) => s.teamCode === team.code)
      const ownedCount = stickers.filter((s) => owned[s.id]).length
      return { team, owned: ownedCount, total: stickers.length }
    })
  }, [owned])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return teamsWithProgress.filter((tp) => {
      const localName = teamName(tp.team, locale).toLowerCase()
      if (q && !localName.includes(q) && !tp.team.code.toLowerCase().includes(q))
        return false
      if (filter === 'complete') return tp.owned === tp.total
      if (filter === 'inprogress') return tp.owned > 0 && tp.owned < tp.total
      if (filter === 'empty') return tp.owned === 0
      return true
    })
  }, [teamsWithProgress, search, filter, locale])

  const counts = useMemo(
    () => ({
      all: teamsWithProgress.length,
      complete: teamsWithProgress.filter((tp) => tp.owned === tp.total).length,
      inprogress: teamsWithProgress.filter((tp) => tp.owned > 0 && tp.owned < tp.total).length,
      empty: teamsWithProgress.filter((tp) => tp.owned === 0).length,
    }),
    [teamsWithProgress],
  )

  // Decide layout: grouped sections by Panini album group (default) vs. a
  // single flat alphabetical grid. Searching or any filter other than "all"
  // also forces flat — group headers become noise when you've narrowed the
  // set already.
  const isFlat = sort === 'alpha' || search.trim() !== '' || filter !== 'all'

  const alphabetical = useMemo(
    () =>
      [...filtered].sort((a, b) =>
        teamName(a.team, locale).localeCompare(teamName(b.team, locale), locale),
      ),
    [filtered, locale],
  )

  // Grouped mode: split the FWC specials out into their own section at the
  // top, then group the 48 nations by Panini album group letter.
  // Three sections, top to bottom: FWC specials → 48 nations by group → CC bonus.
  const specials = filtered.filter((tp) => tp.team.code === 'FWC')
  const bonus = filtered.filter((tp) => tp.team.code === 'CC')
  const nations = filtered.filter(
    (tp) => tp.team.code !== 'FWC' && tp.team.code !== 'CC',
  )
  const groupLetters = Array.from(new Set(nations.map((tp) => tp.team.group).filter(Boolean)))

  return (
    <div>
      <TopBar
        large
        title={t('teams.title')}
        subtitle={t('teams.summary', { n: counts.complete })}
      />

      <div className="px-5">
        <Input
          icon={<Search size={18} />}
          placeholder={t('teams.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter chips + sort toggle on one row. Sort toggle right-aligned. */}
      <div className="px-5 pt-3.5 pb-1 flex items-center gap-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1 min-w-0">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')} count={counts.all}>
            {t('teams.filterAll')}
          </Chip>
          <Chip
            active={filter === 'complete'}
            onClick={() => setFilter('complete')}
            count={counts.complete}
          >
            {t('teams.filterComplete')}
          </Chip>
          <Chip
            active={filter === 'inprogress'}
            onClick={() => setFilter('inprogress')}
            count={counts.inprogress}
          >
            {t('teams.filterInProgress')}
          </Chip>
          <Chip
            active={filter === 'empty'}
            onClick={() => setFilter('empty')}
            count={counts.empty}
          >
            {t('teams.filterEmpty')}
          </Chip>
        </div>

        <div className="flex bg-muted p-0.5 rounded-lg gap-0.5 flex-shrink-0">
          {(
            [
              { id: 'group' as const, label: t('teams.sortGroup') },
              { id: 'alpha' as const, label: t('teams.sortAlpha') },
            ]
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSort(opt.id)}
              className={cn(
                'h-7 px-2.5 rounded-md text-[11px] font-bold flex items-center transition-all',
                sort === opt.id
                  ? 'bg-card text-foreground shadow-token-sm'
                  : 'text-muted-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isFlat ? (
        <div className="px-5 pt-3 grid grid-cols-3 gap-2.5 lg:grid-cols-6">
          {alphabetical.map(({ team, owned: ow, total }) => (
            <TeamCard
              key={team.code}
              team={team}
              name={teamName(team, locale)}
              owned={ow}
              total={total}
              onClick={() => navigate(`/teams/${team.code}`)}
            />
          ))}
        </div>
      ) : (
        <>
          {specials.length > 0 && (
            <section className="px-5 pt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 pl-1">
                {t('teams.specialHeader')}
              </div>
              <div className="grid grid-cols-4 gap-2 lg:grid-cols-4">
                {specials.map(({ team, owned: ow, total }) => (
                  <TeamCard
                    key={team.code}
                    team={team}
                    name={teamName(team, locale)}
                    owned={ow}
                    total={total}
                    onClick={() => navigate(`/teams/${team.code}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {groupLetters.map((group) => {
            const groupTeams = nations.filter((tp) => tp.team.group === group)
            return (
              <section key={group} className="px-5 pt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 pl-1">
                  {t('teams.groupHeader', { letter: group ?? '' })}
                </div>
                <div className="grid grid-cols-4 gap-2 lg:grid-cols-4">
                  {groupTeams.map(({ team, owned: ow, total }) => (
                    <TeamCard
                      key={team.code}
                      team={team}
                      name={teamName(team, locale)}
                      owned={ow}
                      total={total}
                      onClick={() => navigate(`/teams/${team.code}`)}
                    />
                  ))}
                </div>
              </section>
            )
          })}

          {bonus.length > 0 && (
            <section className="px-5 pt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 pl-1">
                {t('teams.bonusHeader')}
              </div>
              <div className="grid grid-cols-4 gap-2 lg:grid-cols-4">
                {bonus.map(({ team, owned: ow, total }) => (
                  <TeamCard
                    key={team.code}
                    team={team}
                    name={teamName(team, locale)}
                    owned={ow}
                    total={total}
                    onClick={() => navigate(`/teams/${team.code}`)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {filtered.length === 0 && (
        <div className="p-10 text-center text-muted-foreground">{t('teams.notFound')}</div>
      )}
    </div>
  )
}

interface TeamCardProps {
  team: import('@/lib/types').Team
  name: string
  owned: number
  total: number
  onClick: () => void
}

function TeamCard({ team, name, owned, total, onClick }: TeamCardProps) {
  const complete = owned === total
  return (
    <button
      onClick={onClick}
      className={cn(
        'bg-card border rounded-[14px] p-2.5 flex flex-col items-center gap-1.5',
        'relative shadow-token-sm active:scale-[0.98] transition-transform',
        complete
          ? 'border-primary shadow-[0_4px_12px_-4px_rgba(34,197,94,0.3)]'
          : 'border-border',
      )}
    >
      {complete && (
        <div className="absolute top-1.5 right-1.5 w-[18px] h-[18px] rounded-full bg-primary text-white flex items-center justify-center">
          <Check size={11} strokeWidth={4} />
        </div>
      )}
      <Flag team={team} size={40} />
      <div className="text-[11px] font-bold text-center leading-tight truncate w-full">
        {name}
      </div>
      <div className="w-full">
        <Progress value={owned} max={total} size="sm" />
        <div className="numeric text-[9px] font-semibold text-muted-foreground mt-0.5 text-center">
          {owned}/{total}
        </div>
      </div>
    </button>
  )
}
