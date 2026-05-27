import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Shield, FileText } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { BrandMark } from '@/components/ui/Brand'
import { TopBar } from '@/components/ui/TopBar'
import { IconBtn } from '@/components/ui/IconBtn'
import { useT } from '@/i18n/I18nProvider'

// Brand icons (lucide-react ≥0.300 removed brand marks for licensing reasons,
// so we ship our own minimal SVG marks instead).
const GithubIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1.18-.02-2.14-3.2.69-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11.1 11.1 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.35.78 1.05.78 2.11 0 1.52-.01 2.75-.01 3.13 0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
  </svg>
)

const YoutubeIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M23.5 7.1c-.3-1-1-1.8-2-2-1.7-.5-9.5-.5-9.5-.5s-7.8 0-9.5.5c-1 .3-1.8 1-2 2C0 8.8 0 12 0 12s0 3.2.5 4.9c.3 1 1 1.8 2 2 1.7.5 9.5.5 9.5.5s7.8 0 9.5-.5c1-.3 1.8-1 2-2 .5-1.7.5-4.9.5-4.9s0-3.2-.5-4.9ZM9.6 15.6V8.4l6.4 3.6-6.4 3.6Z" />
  </svg>
)

// External links — single source of truth so the buttons stay in sync with
// README, manifest, and metadata. Update here when the GitHub repo or
// feedback inbox change.
const LINKS = {
  github: 'https://github.com/lukashuettis/stickerlog',
  youtube: 'https://www.youtube.com/@lukashuettis',
  feedback: 'mailto:lukash@posteo.de?subject=StickerLog%20feedback',
  privacy: 'https://github.com/lukashuettis/stickerlog/blob/main/PRIVACY.md',
  license: 'https://github.com/lukashuettis/stickerlog/blob/main/LICENSE',
}

export function AboutPage() {
  const navigate = useNavigate()
  const t = useT()

  return (
    <div>
      <div className="lg:hidden">
        <TopBar
          large
          title={t('about.title')}
          subtitle={t('brand.claim')}
          left={
            <IconBtn
              icon={<ArrowLeft size={22} />}
              onClick={() => navigate('/settings')}
              label={t('common.back')}
            />
          }
        />
      </div>

      <div className="hidden lg:block pt-2 mb-6">
        <h1 className="text-[28px] font-extrabold tracking-tight m-0">
          {t('about.title')}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1 m-0">{t('brand.claim')}</p>
      </div>

      {/* Logo + intro */}
      <div className="px-5 pt-2 lg:px-0">
        <Card className="p-6 flex flex-col items-center gap-4 text-center">
          <BrandMark size={72} className="text-foreground" />
          <div className="space-y-3 max-w-md">
            <p className="text-[15px] font-medium leading-relaxed m-0">{t('about.intro')}</p>
            <p className="text-sm text-muted-foreground leading-relaxed m-0">
              {t('about.features')}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed m-0">
              {t('about.privacy')}
            </p>
          </div>
        </Card>
      </div>

      {/* Built-by block */}
      <div className="px-5 pt-3 lg:px-0">
        <Card className="p-5 text-center space-y-1">
          <p className="text-sm font-semibold m-0">{t('about.builtBy')}</p>
          <p className="text-xs text-muted-foreground italic m-0">{t('about.vibecoded')}</p>
        </Card>
      </div>

      {/* Link buttons */}
      <div className="px-5 pt-3 lg:px-0 grid grid-cols-2 gap-2">
        <AboutLink href={LINKS.github} icon={<GithubIcon size={18} />} label={t('about.btnGithub')} />
        <AboutLink href={LINKS.youtube} icon={<YoutubeIcon size={18} />} label={t('about.btnYoutube')} />
        <AboutLink
          href={LINKS.feedback}
          icon={<Mail size={18} />}
          label={t('about.btnFeedback')}
        />
        <AboutLink
          href={LINKS.privacy}
          icon={<Shield size={18} />}
          label={t('about.btnPrivacy')}
        />
        <AboutLink
          href={LINKS.license}
          icon={<FileText size={18} />}
          label={t('about.btnLicense')}
          className="col-span-2"
        />
      </div>

      {/* Disclaimer */}
      <div className="px-5 pt-5 lg:px-0 pb-8">
        <p className="text-[11px] text-muted-foreground leading-relaxed text-center max-w-md mx-auto m-0">
          {t('about.disclaimer')}
        </p>
      </div>
    </div>
  )
}

function AboutLink({
  href,
  icon,
  label,
  className,
}: {
  href: string
  icon: React.ReactNode
  label: string
  className?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={
        'flex items-center justify-center gap-2 h-12 rounded-xl bg-card border border-border ' +
        'text-sm font-semibold text-foreground transition-colors hover:bg-muted ' +
        (className ?? '')
      }
    >
      {icon}
      {label}
    </a>
  )
}
