import { useRef } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { AlbumSlot } from '@/lib/types'

interface StickerTileProps {
  sticker: AlbumSlot
  count: number
  onTap?: () => void
  onLong?: () => void
  showName?: boolean
}

/**
 * One sticker square in the team grid. Tap = open detail/sheet, long-press = +1 shortcut.
 * Long-press threshold is 450ms.
 */
export function StickerTile({ sticker, count, onTap, onLong, showName = true }: StickerTileProps) {
  const longTimer = useRef<number | null>(null)
  const longFired = useRef(false)

  const handleDown = () => {
    longFired.current = false
    longTimer.current = window.setTimeout(() => {
      onLong?.()
      longFired.current = true
      longTimer.current = null
    }, 450)
  }

  const handleUp = () => {
    if (longTimer.current !== null) {
      clearTimeout(longTimer.current)
      longTimer.current = null
      if (!longFired.current) onTap?.()
    }
  }

  const handleLeave = () => {
    if (longTimer.current !== null) {
      clearTimeout(longTimer.current)
      longTimer.current = null
    }
  }

  const owned = count > 0
  const dup = count > 1

  return (
    <div
      onMouseDown={handleDown}
      onMouseUp={handleUp}
      onMouseLeave={handleLeave}
      onTouchStart={handleDown}
      onTouchEnd={handleUp}
      onTouchCancel={handleLeave}
      role="button"
      tabIndex={0}
      className={cn(
        'relative aspect-[0.72] rounded-[10px] p-1.5',
        'flex flex-col justify-between cursor-pointer no-select',
        'transition-[transform,background] duration-200',
        owned
          ? 'bg-owned-bg text-owned-fg border-none'
          : 'bg-missing-bg text-missing-fg border border-dashed border-border',
      )}
    >
      {/* The sticker code (e.g. "GER-14") is the dominant label — this is what
          the user types in to add it. The global album position is no longer
          shown to keep the grid uncluttered. */}
      <div
        className={cn(
          'numeric text-[13px] font-extrabold tracking-tight leading-none',
          owned ? 'opacity-100' : 'opacity-80',
        )}
      >
        {sticker.id}
      </div>
      {owned ? (
        <div className="flex items-center justify-center flex-1">
          <Check size={20} strokeWidth={3} />
        </div>
      ) : (
        <div className="flex-1" />
      )}
      {showName && sticker.playerName && (
        <div
          className={cn(
            'text-[9px] font-medium leading-tight overflow-hidden text-ellipsis whitespace-nowrap',
            owned ? 'opacity-95' : 'opacity-70',
          )}
        >
          {sticker.playerName ?? sticker.id}
        </div>
      )}
      {dup && (
        <div className="numeric absolute -top-1 -right-1 bg-foreground text-background text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-token-sm">
          ×{count}
        </div>
      )}
    </div>
  )
}
