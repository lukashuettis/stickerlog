import { useEffect, useState } from 'react'
import { isIOS as detectIOS, isStandalone as detectStandalone } from '@/lib/ios-pwa'

// Non-standard but widely supported Chromium event. Not in lib.dom.d.ts.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface InstallPromptState {
  /** True if Chromium has fired `beforeinstallprompt` — native dialog available. */
  canPrompt: boolean
  /** True if running on iOS Safari outside of standalone (PWA) mode. */
  isIOS: boolean
  /** True if the app is already running as an installed PWA. */
  isInstalled: boolean
  /**
   * Trigger the native install dialog (Chromium only). Resolves once the
   * user has accepted or dismissed it. On platforms without `canPrompt`,
   * this is a no-op — callers should fall back to a manual instructions UI.
   */
  triggerInstall: () => Promise<void>
}

/**
 * Cross-platform install detection.
 *
 * Chromium (Chrome/Edge/Brave/Samsung Internet on Android, plus desktop):
 *   fires `beforeinstallprompt` when criteria are met (HTTPS, manifest, SW,
 *   ~30s engagement). We capture the event and expose `triggerInstall()` so
 *   the UI can show its own button instead of relying on Chrome's mini-infobar
 *   (which is unreliable since 2023 and gated behind heuristics).
 *
 * iOS Safari:
 *   no native install API exists. The hook reports `isIOS=true` so the UI can
 *   show manual instructions ("Share → Add to Home Screen").
 *
 * Once installed (`appinstalled` event or `display-mode: standalone` matches),
 * `isInstalled=true` and `canPrompt` drops to false — UI should hide install
 * affordances.
 */
export function useInstallPrompt(): InstallPromptState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState<boolean>(() => detectStandalone())

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Prevent Chromium's own mini-infobar — we'll show our own UI instead.
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const triggerInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      // Chromium consumes the event after one prompt() call; release ours too.
      setDeferredPrompt(null)
    }
  }

  return {
    canPrompt: deferredPrompt !== null,
    isIOS: detectIOS(),
    isInstalled,
    triggerInstall,
  }
}
