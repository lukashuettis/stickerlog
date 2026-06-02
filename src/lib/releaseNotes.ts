/**
 * Release-notes seen-state tracking.
 *
 * Stored as a single string in localStorage. When the app's current version
 * differs from `lastSeenVersion`, the Dashboard surfaces a small banner
 * pointing at the latest release notes. Dismiss (or "Verstanden") writes
 * the current version, so the banner won't reappear until the next bump.
 *
 * First-time users (no collection items, no stored version) should never
 * see a "what's new" banner — they have nothing to compare against. The
 * `markSeenSilent()` helper is called on first load to bring them in line.
 */

const KEY = 'stickerlog.lastSeenVersion'

export function getLastSeenVersion(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setLastSeenVersion(version: string): void {
  try {
    localStorage.setItem(KEY, version)
  } catch {
    // Quota or private mode — silently swallow.
  }
}

/**
 * Should the user see the release-notes banner?
 *
 * - hasAnyCollection=false AND no prior version → silently mark as seen
 *   (brand-new install, nothing to celebrate yet)
 * - lastSeen === current → suppress (already saw it)
 * - lastSeen !== current → show banner
 */
export function shouldShowReleaseBanner(
  currentVersion: string,
  hasAnyCollection: boolean,
): boolean {
  const last = getLastSeenVersion()
  if (last === currentVersion) return false
  if (last === null && !hasAnyCollection) {
    // brand-new user — silently align so the banner doesn't bother them later
    setLastSeenVersion(currentVersion)
    return false
  }
  return true
}
