import { cn } from '@/lib/cn'

interface ProgressProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
}

export function Progress({ value, max = 100, size = 'md', color, className }: ProgressProps) {
  const heightClass = size === 'sm' ? 'h-1' : size === 'lg' ? 'h-3' : 'h-2'
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className={cn('w-full bg-muted rounded-full overflow-hidden', heightClass, className)}>
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${pct}%`,
          background: color ?? 'var(--primary)',
        }}
      />
    </div>
  )
}
