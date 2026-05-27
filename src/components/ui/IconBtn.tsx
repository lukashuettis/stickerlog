import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface IconBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label?: string
  badge?: boolean
}

export function IconBtn({ icon, label, badge, className, ...rest }: IconBtnProps) {
  return (
    <button
      {...rest}
      aria-label={label}
      className={cn(
        'w-11 h-11 rounded-xl border-none bg-transparent text-foreground',
        'flex items-center justify-center relative active:bg-muted',
        className,
      )}
    >
      {icon}
      {badge && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive" />
      )}
    </button>
  )
}
