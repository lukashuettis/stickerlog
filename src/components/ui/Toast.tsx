import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Check, Info, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ToastKind = 'success' | 'info' | 'error'

interface ToastState {
  msg: string
  kind: ToastKind
}

interface ToastContextValue {
  show: (msg: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)

  const show = useCallback((msg: string, kind: ToastKind = 'success') => {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 2400)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastDisplay toast={toast} />
    </ToastContext.Provider>
  )
}

function ToastDisplay({ toast }: { toast: ToastState | null }) {
  if (!toast) return null
  const palette = {
    success: { bg: 'bg-foreground text-background', icon: <Check size={18} strokeWidth={3} /> },
    info: { bg: 'bg-foreground text-background', icon: <Info size={18} /> },
    error: { bg: 'bg-destructive text-white', icon: <AlertCircle size={18} /> },
  }[toast.kind]
  return (
    <div
      className={cn(
        'fixed bottom-28 left-1/2 -translate-x-1/2 z-50',
        'px-4 py-3 rounded-full flex items-center gap-2.5 text-sm font-semibold',
        'shadow-token-lg max-w-[85vw] animate-fade-in',
        palette.bg,
      )}
    >
      {palette.icon}
      {toast.msg}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
