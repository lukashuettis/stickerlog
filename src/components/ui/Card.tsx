import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padded?: boolean
}

export function Card({ children, padded = true, className, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={cn(
        'bg-card border border-border rounded-[14px] shadow-token-sm',
        padded && 'p-4',
        className,
      )}
    >
      {children}
    </div>
  )
}
