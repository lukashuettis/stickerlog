import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  suffix?: ReactNode
}

export function Input({ icon, suffix, className, ...rest }: InputProps) {
  return (
    <div
      className={cn(
        'flex items-center h-12 px-3.5 bg-card border border-border rounded-xl gap-2.5',
        'focus-within:border-primary transition-colors',
        className,
      )}
    >
      {icon && <div className="text-muted-foreground flex">{icon}</div>}
      <input
        {...rest}
        className="flex-1 border-none outline-none bg-transparent text-foreground text-[15px] font-inherit min-w-0"
      />
      {suffix && (
        <div className="text-muted-foreground text-sm font-semibold">{suffix}</div>
      )}
    </div>
  )
}
