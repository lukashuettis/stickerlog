import { useMemo, useState } from 'react'
import { Sparkles, X, ChevronRight } from 'lucide-react'
import { Card } from './ui/Card'
import { ReleaseNoteSheet } from './ReleaseNoteSheet'
import { useT } from '@/i18n/I18nProvider'
import { LATEST_RELEASE } from '@/data/releaseNotes'
import {
  shouldShowReleaseBanner,
  setLastSeenVersion,
} from '@/lib/releaseNotes'

interface ReleaseNoteBannerProps {
  /** Pass true if the user has any tracked stickers — first-time installs are silenced. */
  hasCollection: boolean
}

/**
 * Compact "what's new" banner shown on the Dashboard after a version bump.
 * Lives independently from the PWA-Update prompt — that one says "an update
 * is available", this one says "here's what changed after you reloaded".
 *
 * Visibility decision is captured once via lazy initial state so the banner
 * doesn't pop in and out as `hasCollection` updates from IndexedDB.
 */
export function ReleaseNoteBanner({ hasCollection }: ReleaseNoteBannerProps) {
  const t = useT()
  const [sheetOpen, setSheetOpen] = useState(false)
  // Lazy initial state: shouldShowReleaseBanner runs once on mount. It also
  // silently aligns brand-new installs, so this has a side effect on first
  // render — that's intentional and idempotent.
  const [visible, setVisible] = useState(() =>
    shouldShowReleaseBanner(LATEST_RELEASE.version, hasCollection),
  )

  const dismiss = () => {
    setLastSeenVersion(LATEST_RELEASE.version)
    setVisible(false)
    setSheetOpen(false)
  }

  const tagline = useMemo(() => t(LATEST_RELEASE.taglineKey), [t])

  if (!visible) return null

  return (
    <>
      <div className="px-5 lg:px-0 pt-1">
        <Card className="p-3.5 flex items-center gap-3 border-primary border bg-primary-soft/30">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} strokeWidth={2.5} />
          </div>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex-1 min-w-0 text-left bg-transparent border-none px-0"
          >
            <div className="text-sm font-bold leading-tight">
              {t('rn.banner.title', { version: LATEST_RELEASE.version })}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug truncate">
              {tagline}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="text-xs font-semibold text-primary inline-flex items-center gap-0.5 bg-transparent border-none px-1"
          >
            {t('rn.banner.cta')}
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t('common.close')}
            className="text-muted-foreground p-1 bg-transparent border-none"
          >
            <X size={16} />
          </button>
        </Card>
      </div>

      <ReleaseNoteSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onConfirm={dismiss}
      />
    </>
  )
}
