/**
 * iOS Safari isolates tab storage from PWA (home-screen) storage. If a user
 * enters data in the Safari tab and only LATER installs the PWA, that data is
 * NOT carried over — the PWA starts empty.
 *
 * We detect iOS Safari running outside standalone mode and prompt the user to
 * install before they start entering data. After installation, this returns
 * false and the prompt is suppressed.
 */

interface NavigatorStandalone {
  standalone?: boolean
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const standalone = (window.navigator as NavigatorStandalone).standalone === true
  const matchMedia =
    typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
  return standalone || matchMedia
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

export function shouldShowIOSInstallHint(): boolean {
  return isIOS() && !isStandalone()
}
