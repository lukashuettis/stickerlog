/**
 * Theme persistence.
 *
 * Why localStorage as well as IndexedDB?
 * IndexedDB is async — by the time we read `darkMode`, React has already
 * rendered once in light mode, causing a visible flash and (worse) the
 * Sidebar's local useState mirror would overwrite the class back to light.
 * localStorage is synchronous so we can apply the theme class BEFORE React
 * mounts. IndexedDB stays the long-term truth for backups; localStorage is
 * a fast paint-flicker cache that we keep in sync.
 */

const LS_KEY = 'theme'

export function readPersistedDark(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(LS_KEY) === 'dark'
}

export function persistDark(dark: boolean): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LS_KEY, dark ? 'dark' : 'light')
  }
}

export function applyDarkClass(dark: boolean): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', dark)
}

/** Call this once at app bootstrap, BEFORE React renders. */
export function applyPersistedTheme(): void {
  applyDarkClass(readPersistedDark())
}
