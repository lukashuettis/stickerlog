import { Home, Grid3X3, Plus, ArrowLeftRight } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n/I18nProvider'
import type { MessageKey } from '@/i18n/messages'

interface NavItem {
  to: string
  labelKey: MessageKey
  icon: typeof Home
  matchPrefix?: string
}

const ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.album', icon: Home },
  { to: '/teams', labelKey: 'nav.teams', icon: Grid3X3, matchPrefix: '/teams' },
  { to: '/scan', labelKey: 'nav.enterShort', icon: Plus },
  { to: '/trade', labelKey: 'nav.trade', icon: ArrowLeftRight },
]

export function BottomNav() {
  const location = useLocation()
  const t = useT()

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 lg:hidden',
        'bg-card/90 backdrop-blur-xl border-t border-border',
        'grid grid-cols-4 pt-2 pb-7',
      )}
    >
      {ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = item.matchPrefix
          ? location.pathname.startsWith(item.matchPrefix)
          : location.pathname === item.to
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              'flex flex-col items-center gap-1 py-1.5 px-1 min-h-14 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon size={24} strokeWidth={isActive ? 2.4 : 2} />
            <span
              className={cn(
                'text-[10.5px] tracking-wide',
                isActive ? 'font-bold' : 'font-medium',
              )}
            >
              {t(item.labelKey)}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}
