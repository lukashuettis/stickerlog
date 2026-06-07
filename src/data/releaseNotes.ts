import type { MessageKey } from '@/i18n/messages'

/**
 * Per-release notes shown in a small Dashboard banner the first time a user
 * loads a new version. Newest entry first.
 *
 * When you ship a release, add an entry at the TOP with:
 *   - version: must match package.json + APP_VERSION in backup.ts
 *   - date:    ISO YYYY-MM-DD
 *   - titleKey + bodyKeys: i18n keys (define them in messages.ts)
 *
 * No personal data leaves the device. The "last seen version" lives in
 * localStorage and is purely a per-device hint.
 */
export interface ReleaseNote {
  version: string
  date: string
  titleKey: MessageKey
  /** One-line tagline shown in the banner */
  taglineKey: MessageKey
  /** 3–6 bullets shown in the details sheet */
  highlights: MessageKey[]
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '0.2.1',
    date: '2026-06-07',
    titleKey: 'rn.0_2_1.title',
    taglineKey: 'rn.0_2_1.tagline',
    highlights: [
      'rn.0_2_1.h1',
      'rn.0_2_1.h2',
      'rn.0_2_1.h3',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-06-02',
    titleKey: 'rn.0_2_0.title',
    taglineKey: 'rn.0_2_0.tagline',
    highlights: [
      'rn.0_2_0.h1',
      'rn.0_2_0.h2',
      'rn.0_2_0.h3',
      'rn.0_2_0.h4',
      'rn.0_2_0.h5',
    ],
  },
]

/** The latest release. Always defined since the array is non-empty by design. */
export const LATEST_RELEASE: ReleaseNote = RELEASE_NOTES[0]
