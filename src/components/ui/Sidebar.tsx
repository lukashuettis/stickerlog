import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Home,
  Grid3X3,
  Plus,
  ArrowLeftRight,
  TrendingUp,
  Settings as SettingsIcon,
  ShoppingBag,
  Moon,
  Sun,
} from 'lucide-react'
import { Card } from './Card'
import { BrandMark } from './Brand'
import { cn } from '@/lib/cn'
import { db } from '@/lib/db'
import { applyDarkClass, persistDark, readPersistedDark } from '@/lib/theme'
import { useT } from '@/i18n/I18nProvider'
import type { MessageKey } from '@/i18n/messages'

interface NavItem {
  to: string
  labelKey: MessageKey
  icon: typeof Home
  matchPrefix?: string
}

const NAV: NavItem[] = [
  { to: '/', labelKey: 'nav.album', icon: Home },
  { to: '/teams', labelKey: 'nav.teams', icon: Grid3X3, matchPrefix: '/teams' },
  { to: '/scan', labelKey: 'nav.enter', icon: Plus },
  { to: '/packs', labelKey: 'nav.purchases', icon: ShoppingBag },
  { to: '/trade', labelKey: 'nav.trade', icon: ArrowLeftRight },
  { to: '/stats', labelKey: 'nav.stats', icon: TrendingUp },
  { to: '/settings', labelKey: 'common.settings', icon: SettingsIcon },
]

/**
 * Desktop sidebar (≥lg). Mirrors the Claude-Design layout: brand block on
 * top, primary nav, a soft info card, then a theme toggle at the bottom.
 *
 * Hidden on small screens — there the BottomNav drives navigation.
 */
export function Sidebar() {
  const location = useLocation()
  const t = useT()
  // Seed from the synchronous localStorage cache so the toggle reflects the
  // actual class that was applied in main.tsx — no race, no flash.
  const [dark, setDark] = useState<boolean>(() => readPersistedDark())
  const firstRender = useRef(true)

  useEffect(() => {
    // Skip the very first effect run — main.tsx already applied the persisted
    // theme. Only react to actual user toggles afterwards.
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    applyDarkClass(dark)
    persistDark(dark)
    void db.settings.put({ key: 'darkMode', value: dark })
  }, [dark])

  return (
    <aside className="hidden lg:flex w-60 flex-col gap-1 border-r border-border bg-card px-3 py-5 sticky top-0 h-screen">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2.5 pb-4 pt-2">
        <BrandMark size={36} className="text-foreground" />
        <div>
          <div className="text-sm font-extrabold leading-tight">{t('brand.title')}</div>
          <div className="text-[11px] text-muted-foreground">{t('brand.subtitle')}</div>
        </div>
      </div>

      {/* Nav */}
      {NAV.map((item) => {
        const Icon = item.icon
        const active = item.matchPrefix
          ? location.pathname.startsWith(item.matchPrefix)
          : location.pathname === item.to
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors',
              active
                ? 'bg-muted font-bold text-foreground'
                : 'font-medium text-foreground/80 hover:bg-muted/60',
            )}
          >
            <Icon size={18} strokeWidth={active ? 2.4 : 2} />
            <span className="flex-1 text-left">{t(item.labelKey)}</span>
          </NavLink>
        )
      })}

      <div className="flex-1" />

      {/* Soft info card — privacy reassurance, replaces the design's "Sync" card */}
      <Card padded={false} className="p-3 bg-muted border-transparent shadow-none">
        <div className="text-[10px] font-bold text-muted-foreground tracking-wider mb-1">
          {t('sidebar.privateTitle')}
        </div>
        <div className="text-xs font-semibold">{t('sidebar.privateHeader')}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {t('sidebar.privateBody')}
        </div>
      </Card>

      {/* Theme toggle */}
      <button
        onClick={() => setDark((v) => !v)}
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted/60"
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
        {dark ? t('sidebar.themeLight') : t('sidebar.themeDark')}
      </button>
    </aside>
  )
}
