import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  full?: boolean
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-primary text-primary-foreground border border-transparent active:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground border border-transparent',
  outline: 'bg-transparent text-foreground border border-border',
  ghost: 'bg-transparent text-foreground border border-transparent',
  destructive: 'bg-destructive text-white border border-transparent',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-[13px] gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-13 px-5 text-[15px] gap-2.5',
  xl: 'h-15 px-6 text-base gap-3',
}

export function Button({
  children,
  variant = 'default',
  size = 'md',
  icon,
  full,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center justify-center rounded-[10px] font-semibold tracking-tight',
        'transition-[transform,opacity,background] duration-150',
        'active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100',
        variantClasses[variant],
        sizeClasses[size],
        full && 'w-full',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  )
}
