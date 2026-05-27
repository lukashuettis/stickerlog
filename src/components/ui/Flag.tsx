import { cn } from '@/lib/cn'
import type { Team } from '@/lib/types'

interface FlagProps {
  team?: Team
  size?: number
  className?: string
}

/**
 * 3-band coloured disc — a deliberately neutral, non-Panini representation.
 * Avoids real flags + trademarks so the app stays a clean "unofficial fan project".
 */
export function Flag({ team, size = 32, className }: FlagProps) {
  if (!team) {
    return (
      <div
        className={cn(
          'rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold flex-shrink-0',
          className,
        )}
        style={{ width: size, height: size, fontSize: size * 0.34 }}
      >
        ★
      </div>
    )
  }

  const [c1, c2, c3] = team.flagColors
  const labelFontSize = size * (team.code.length >= 3 ? 0.26 : 0.32)

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden relative flex-shrink-0',
        'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0" style={{ background: c1 }} />
      <div
        className="absolute top-0 bottom-0"
        style={{ left: '33.3%', right: '33.3%', background: c2 }}
      />
      <div className="absolute top-0 bottom-0 right-0" style={{ width: '33.3%', background: c3 }} />
      <div
        className="absolute inset-0 flex items-center justify-center font-extrabold text-black/60"
        style={{
          fontSize: labelFontSize,
          letterSpacing: -0.5,
          textShadow: '0 1px 0 rgba(255,255,255,0.3)',
        }}
      >
        {team.code}
      </div>
    </div>
  )
}
