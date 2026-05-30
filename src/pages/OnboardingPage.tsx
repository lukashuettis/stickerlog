import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layers,
  Zap,
  Moon,
  Download,
  Smartphone,
  Share,
  Plus,
  Check,
  MoreVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { setSetting } from '@/lib/db'
import { useT } from '@/i18n/I18nProvider'
import type { MessageKey } from '@/i18n/messages'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { cn } from '@/lib/cn'

// ─── Slide model ───────────────────────────────────────────────────────────
//
// Two flavours: "standard" slides (most of onboarding — icon + title + body)
// and the "install" slide, which adapts to platform and may render a native
// install button when Chromium has fired `beforeinstallprompt`.

interface StandardSlide {
  kind: 'standard'
  color: string
  Icon: typeof Layers
  titleKey: MessageKey
  bodyKey: MessageKey
}

interface InstallSlide {
  kind: 'install'
}

type Slide = StandardSlide | InstallSlide

const BASE_SLIDES: Slide[] = [
  { kind: 'standard', color: '#22c55e', Icon: Layers, titleKey: 'onboarding.s1.title', bodyKey: 'onboarding.s1.body' },
  { kind: 'standard', color: '#3b82f6', Icon: Zap, titleKey: 'onboarding.s2.title', bodyKey: 'onboarding.s2.body' },
  { kind: 'standard', color: '#a855f7', Icon: Moon, titleKey: 'onboarding.s3.title', bodyKey: 'onboarding.s3.body' },
  { kind: 'install' },
  { kind: 'standard', color: '#f59e0b', Icon: Download, titleKey: 'onboarding.s4.title', bodyKey: 'onboarding.s4.body' },
]

export function OnboardingPage() {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const t = useT()
  const install = useInstallPrompt()

  // Hide the install slide if the app is already running as a PWA — there's
  // nothing to install. Memoised so the active step index stays stable.
  const slides = useMemo<Slide[]>(() => {
    if (install.isInstalled) return BASE_SLIDES.filter((s) => s.kind !== 'install')
    return BASE_SLIDES
  }, [install.isInstalled])

  const slide = slides[step]
  const isLast = step === slides.length - 1

  const finish = async () => {
    await setSetting('onboardingCompleted', true)
    navigate('/')
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="pt-14 px-5 flex justify-between">
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-[width,background] duration-300',
                step === i ? 'w-6 bg-foreground' : 'w-1.5 bg-muted',
              )}
            />
          ))}
        </div>
        <button
          onClick={finish}
          className="bg-transparent border-none text-sm font-semibold text-muted-foreground"
        >
          {t('common.skip')}
        </button>
      </div>

      <div
        key={step}
        className="flex-1 flex flex-col items-center justify-center px-8 gap-6 text-center animate-fade-in"
      >
        {slide.kind === 'standard' ? (
          <StandardSlideContent slide={slide} />
        ) : (
          <InstallSlideContent install={install} />
        )}
      </div>

      <div className="px-5 pb-15 flex flex-col gap-2.5">
        <Button full size="xl" onClick={() => (isLast ? finish() : setStep(step + 1))}>
          {isLast ? t('common.getStarted') : t('common.continue')}
        </Button>
      </div>
    </div>
  )
}

// ─── Standard slide (s1–s3, s5) ────────────────────────────────────────────

function StandardSlideContent({ slide }: { slide: StandardSlide }) {
  const t = useT()
  const Icon = slide.Icon
  return (
    <>
      <div
        className="w-40 h-40 rounded-[40px] flex items-center justify-center"
        style={{
          background: `color-mix(in srgb, ${slide.color} 12%, var(--card))`,
          color: slide.color,
          boxShadow: `0 24px 60px -12px ${slide.color}44`,
        }}
      >
        <Icon size={60} strokeWidth={1.5} />
      </div>
      <div>
        <h2 className="text-2xl font-extrabold mb-2.5 tracking-tight m-0">
          {t(slide.titleKey)}
        </h2>
        <p className="text-[15px] text-muted-foreground m-0 leading-relaxed max-w-[280px]">
          {t(slide.bodyKey)}
        </p>
      </div>
    </>
  )
}

// ─── Install slide — adapts to platform ────────────────────────────────────

type InstallPlatform = 'ios' | 'android' | 'desktop'

function detectPlatform(isIOS: boolean): InstallPlatform {
  if (isIOS) return 'ios'
  if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) {
    return 'android'
  }
  return 'desktop'
}

function InstallSlideContent({
  install,
}: {
  install: ReturnType<typeof useInstallPrompt>
}) {
  const t = useT()
  const platform = detectPlatform(install.isIOS)
  const COLOR = '#0ea5e9' // sky blue — distinct from the other slides

  const titleKey: MessageKey =
    platform === 'ios'
      ? 'install.slideTitleIos'
      : platform === 'android'
        ? 'install.slideTitleAndroid'
        : 'install.slideTitleDesktop'

  const bodyKey: MessageKey =
    platform === 'ios'
      ? 'install.slideBodyIos'
      : platform === 'android'
        ? 'install.slideBodyAndroid'
        : 'install.slideBodyDesktop'

  return (
    <>
      <div
        className="w-32 h-32 rounded-[32px] flex items-center justify-center"
        style={{
          background: `color-mix(in srgb, ${COLOR} 12%, var(--card))`,
          color: COLOR,
          boxShadow: `0 24px 60px -12px ${COLOR}44`,
        }}
      >
        <Smartphone size={56} strokeWidth={1.5} />
      </div>
      <div>
        <h2 className="text-2xl font-extrabold mb-2.5 tracking-tight m-0">{t(titleKey)}</h2>
        <p className="text-[15px] text-muted-foreground m-0 leading-relaxed max-w-[320px]">
          {t(bodyKey)}
        </p>
      </div>

      {/* Steps */}
      <ol className="m-0 p-0 list-none space-y-2.5 text-left max-w-[320px] w-full">
        {platform === 'ios' && (
          <>
            <Step n={1} icon={<Share size={16} />} text={t('install.iosStep1')} color={COLOR} />
            <Step n={2} icon={<Plus size={16} />} text={t('install.iosStep2')} color={COLOR} />
            <Step n={3} icon={<Check size={16} />} text={t('install.iosStep3')} color={COLOR} />
          </>
        )}
        {platform === 'android' && (
          <>
            <Step
              n={1}
              icon={<MoreVertical size={16} />}
              text={t('install.androidStep1')}
              color={COLOR}
            />
            <Step n={2} icon={<Plus size={16} />} text={t('install.androidStep2')} color={COLOR} />
            <Step
              n={3}
              icon={<Check size={16} />}
              text={t('install.androidStep3')}
              color={COLOR}
            />
          </>
        )}
        {platform === 'desktop' && (
          <>
            <Step
              n={1}
              icon={<MoreVertical size={16} />}
              text={t('install.androidStep1')}
              color={COLOR}
            />
            <Step n={2} icon={<Plus size={16} />} text={t('install.androidStep2')} color={COLOR} />
          </>
        )}
      </ol>

      {/* Optional native install button if Chromium fired the prompt event */}
      {install.canPrompt && (
        <button
          onClick={() => void install.triggerInstall()}
          className="text-sm font-semibold rounded-xl border border-primary px-4 py-2 text-primary hover:bg-primary-soft transition-colors"
        >
          {t('install.installNow')}
        </button>
      )}
    </>
  )
}

function Step({
  n,
  icon,
  text,
  color,
}: {
  n: number
  icon: React.ReactNode
  text: string
  color: string
}) {
  return (
    <li className="flex items-start gap-3">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-extrabold"
        style={{
          background: `color-mix(in srgb, ${color} 12%, var(--card))`,
          color: color,
        }}
      >
        {n}
      </div>
      <div className="flex-1 pt-1 text-sm leading-snug flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span>{text}</span>
      </div>
    </li>
  )
}
