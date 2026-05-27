import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  active?: boolean
  count?: number
}

export function Chip({ children, active, count, className, ...rest }: ChipProps) {
  return (
    <button
      {...rest}
      className={cn(
        'h-9 px-3.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full',
        'text-[13px] font-semibold transition-colors duration-150 border',
        active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-card text-foreground border-border',
        className,
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            'numeric text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
            active ? 'bg-white/20' : 'bg-muted text-muted-foreground',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
