/**
 * When a user lands on a /trade/check/<payload> link without any local
 * collection data (Case 3 — completely new user, or Case 2 on iOS Safari
 * where the PWA storage is isolated), we don't want the payload to be
 * lost the moment they tap "Eigene Sammlung starten" and finish onboarding.
 *
 * So we stash it in localStorage with a 30-day TTL. After the user has
 * any data in their album, the dashboard surfaces a banner pointing them
 * back to the pending check.
 */

const KEY = 'stickerlog.pendingPayload'
const SESSION_DISMISS_KEY = 'stickerlog.pendingDismissedAt'
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

interface StoredPayload {
  payload: string
  savedAt: string // ISO
}

export function savePendingPayload(payload: string): void {
  try {
    const stored: StoredPayload = { payload, savedAt: new Date().toISOString() }
    localStorage.setItem(KEY, JSON.stringify(stored))
  } catch {
    // Quota or private mode — silently swallow, not worth surfacing.
  }
}

export function getPendingPayload(): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredPayload
    if (!parsed.payload || !parsed.savedAt) {
      localStorage.removeItem(KEY)
      return null
    }
    const age = Date.now() - new Date(parsed.savedAt).getTime()
    if (age > TTL_MS) {
      localStorage.removeItem(KEY)
      return null
    }
    return parsed.payload
  } catch {
    return null
  }
}

export function clearPendingPayload(): void {
  try {
    localStorage.removeItem(KEY)
    sessionStorage.removeItem(SESSION_DISMISS_KEY)
  } catch {
    // ignore
  }
}

/**
 * Mark the pending banner as dismissed for the current browser session only.
 * The payload itself stays — the user can still return to it from the TradePage
 * re-entry hint. This avoids the "I clicked Später and now I can never find it
 * again" trap.
 */
export function dismissPendingForSession(): void {
  try {
    sessionStorage.setItem(SESSION_DISMISS_KEY, '1')
  } catch {
    // ignore
  }
}

export function isPendingDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}
