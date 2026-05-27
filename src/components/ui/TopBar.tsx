import type { ReactNode } from 'react'

interface TopBarProps {
  title: string
  subtitle?: string
  left?: ReactNode
  right?: ReactNode
  large?: boolean
}

export function TopBar({ title, subtitle, left, right, large }: TopBarProps) {
  return (
    <div
      className="bg-background px-5 pt-14"
      style={{ paddingBottom: large ? 12 : 10 }}
    >
      <div className="flex items-center justify-between min-h-9 relative">
        <div className="flex items-center gap-1">{left}</div>
        {!large && (
          <div className="absolute left-1/2 -translate-x-1/2 text-base font-bold">{title}</div>
        )}
        <div className="flex items-center gap-1">{right}</div>
      </div>
      {large && (
        <div className="mt-2">
          <h1 className="text-3xl font-extrabold m-0 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 m-0">{subtitle}</p>}
        </div>
      )}
    </div>
  )
}
