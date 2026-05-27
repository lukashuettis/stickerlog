import type { ReactNode } from 'react'
import { Card } from './Card'
import { cn } from '@/lib/cn'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: ReactNode
  accent?: string
  className?: string
}

export function StatCard({ label, value, sub, icon, accent, className }: StatCardProps) {
  return (
    <Card className={cn('p-3.5', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon && (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: accent ?? 'var(--muted)',
              color: accent ? 'white' : 'var(--muted-foreground)',
            }}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="numeric text-[26px] font-bold leading-none tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  )
}
