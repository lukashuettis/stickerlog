import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { cn } from '@/lib/cn'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

export function BottomSheet({ open, onClose, children, className }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-40 animate-fade-in"
        aria-hidden
      />
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl px-5 pt-3 pb-7',
          'shadow-[0_-8px_32px_rgba(0,0,0,0.18)] animate-slide-up',
          'max-h-[85vh] overflow-auto',
          className,
        )}
        role="dialog"
      >
        <div className="w-9 h-1 rounded-full bg-border mx-auto mb-3" />
        {children}
      </div>
    </>
  )
}
