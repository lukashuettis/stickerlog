import { beforeEach, describe, expect, it } from 'vitest'
import {
  getLastSeenVersion,
  setLastSeenVersion,
  shouldShowReleaseBanner,
} from '@/lib/releaseNotes'

const KEY = 'stickerlog.lastSeenVersion'

beforeEach(() => {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
})

describe('releaseNotes — last-seen version tracking', () => {
  it('starts with no stored version', () => {
    expect(getLastSeenVersion()).toBeNull()
  })

  it('round-trips a stored version', () => {
    setLastSeenVersion('0.2.0')
    expect(getLastSeenVersion()).toBe('0.2.0')
  })
})

describe('releaseNotes — shouldShowReleaseBanner', () => {
  it('suppresses the banner for brand-new installs (no data + no stored version)', () => {
    // Brand-new user: should silently align without showing
    const show = shouldShowReleaseBanner('0.2.0', false)
    expect(show).toBe(false)
    // …and that "silent alignment" persists the current version so future
    // visits don't suddenly start showing it.
    expect(getLastSeenVersion()).toBe('0.2.0')
  })

  it('shows the banner when a returning user upgrades', () => {
    setLastSeenVersion('0.1.2')
    const show = shouldShowReleaseBanner('0.2.0', true)
    expect(show).toBe(true)
  })

  it('shows the banner when a new user installed before but has data and no stored version', () => {
    // No stored version yet, but the user already has tracked stickers
    // (came from a backup import, for example).
    const show = shouldShowReleaseBanner('0.2.0', true)
    expect(show).toBe(true)
  })

  it('does not show the banner when versions match', () => {
    setLastSeenVersion('0.2.0')
    const show = shouldShowReleaseBanner('0.2.0', true)
    expect(show).toBe(false)
  })
})
