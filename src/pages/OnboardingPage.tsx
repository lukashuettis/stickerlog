import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Zap, Moon, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { setSetting } from '@/lib/db'
import { useT } from '@/i18n/I18nProvider'
import type { MessageKey } from '@/i18n/messages'
import { cn } from '@/lib/cn'

interface Slide {
  color: string
  Icon: typeof Layers
  titleKey: MessageKey
  bodyKey: MessageKey
}

const SLIDES: Slide[] = [
  { color: '#22c55e', Icon: Layers, titleKey: 'onboarding.s1.title', bodyKey: 'onboarding.s1.body' },
  { color: '#3b82f6', Icon: Zap, titleKey: 'onboarding.s2.title', bodyKey: 'onboarding.s2.body' },
  { color: '#a855f7', Icon: Moon, titleKey: 'onboarding.s3.title', bodyKey: 'onboarding.s3.body' },
  { color: '#f59e0b', Icon: Download, titleKey: 'onboarding.s4.title', bodyKey: 'onboarding.s4.body' },
]

export function OnboardingPage() {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const t = useT()
  const slide = SLIDES[step]
  const isLast = step === SLIDES.length - 1
  const Icon = slide.Icon

  const finish = async () => {
    await setSetting('onboardingCompleted', true)
    navigate('/')
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="pt-14 px-5 flex justify-between">
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
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
        className="flex-1 flex flex-col items-center justify-center px-8 gap-8 text-center animate-fade-in"
      >
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
      </div>

      <div className="px-5 pb-15 flex flex-col gap-2.5">
        <Button full size="xl" onClick={() => (isLast ? finish() : setStep(step + 1))}>
          {isLast ? t('common.getStarted') : t('common.continue')}
        </Button>
      </div>
    </div>
  )
}
