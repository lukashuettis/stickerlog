import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  Upload,
  Moon,
  Sun,
  Globe,
  RefreshCw,
  AlertCircle,
  Info,
  Layers,
  ChevronRight,
  Smartphone,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TopBar } from '@/components/ui/TopBar'
import { IconBtn } from '@/components/ui/IconBtn'
import { useToast } from '@/components/ui/Toast'
import { InstallSheet } from '@/components/InstallSheet'
import { useSetting } from '@/hooks/useCollection'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { downloadBackup, importBackup, type ImportMode } from '@/lib/backup'
import { setSetting, wipeAllUserData } from '@/lib/db'
import { applyDarkClass, persistDark } from '@/lib/theme'
import { useI18n } from '@/i18n/I18nProvider'
import type { Locale } from '@/i18n/messages'
import { cn } from '@/lib/cn'

export function SettingsPage() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { t, locale, setLocale } = useI18n()
  const lastBackupAt = useSetting<string>('lastBackupAt')
  const darkMode = useSetting<boolean>('darkMode', false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const install = useInstallPrompt()
  const [iosSheetOpen, setIosSheetOpen] = useState(false)
  // Show the install row whenever we have any actionable install path AND
  // the app isn't already running as a PWA. On iOS we can always at least
  // show the manual instructions; on Chromium we need the prompt event.
  const showInstallRow = !install.isInstalled && (install.canPrompt || install.isIOS)
  const handleInstallClick = () => {
    if (install.canPrompt) {
      void install.triggerInstall()
    } else if (install.isIOS) {
      setIosSheetOpen(true)
    }
  }

  // Date.now() is impure; useMemo caches the result per render. The rule
  // doesn't recognise the cache, but practically this only re-computes when
  // lastBackupAt changes — re-renders for unrelated state won't drift.
  const backupAgeDays = useMemo(() => {
    if (!lastBackupAt) return null
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now()
    return Math.floor((now - new Date(lastBackupAt).getTime()) / (1000 * 60 * 60 * 24))
  }, [lastBackupAt])
  const backupStale = backupAgeDays !== null && backupAgeDays > 7

  const handleDownload = async () => {
    await downloadBackup()
    show(t('settings.backupSaved'))
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importBackup(file, importMode)
      show(t('settings.backupImported'))
    } catch (err) {
      show(err instanceof Error ? err.message : t('settings.backupImported'), 'error')
    } finally {
      e.target.value = ''
    }
  }

  const handleToggleDark = async () => {
    const next = !darkMode
    applyDarkClass(next)
    persistDark(next)
    await setSetting('darkMode', next)
  }

  const handleLang = (lang: Locale) => {
    setLocale(lang)
  }

  const handleReset = async () => {
    if (!confirm(t('settings.resetConfirm'))) return
    await wipeAllUserData()
    show(t('settings.resetToast'))
    navigate('/')
  }

  return (
    <div>
      <TopBar
        large
        title={t('settings.title')}
        left={
          <IconBtn
            icon={<ArrowLeft size={22} />}
            onClick={() => navigate('/')}
            label={t('common.back')}
          />
        }
      />

      {/* Backup — prominent */}
      <div className="px-5 pt-1">
        <Card
          className={cn(
            'p-4 border-2',
            backupStale ? 'border-destructive' : 'border-primary',
          )}
        >
          <div className="flex items-start gap-3 mb-3.5">
            <div
              className={cn(
                'w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0',
                backupStale
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-primary-soft text-primary-soft-foreground',
              )}
            >
              <Download size={22} />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-extrabold mb-0.5">{t('settings.backup')}</div>
              <div
                className={cn(
                  'text-xs font-semibold',
                  backupStale ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {lastBackupAt
                  ? backupStale
                    ? t('settings.backupStale', { n: backupAgeDays ?? 0 })
                    : t('settings.backupAgo', { n: backupAgeDays ?? 0 })
                  : t('settings.backupNoneYet')}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {t('settings.backupDesc')}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="md" icon={<Download size={18} />} onClick={handleDownload}>
              {t('settings.backupSave')}
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={<Upload size={18} />}
              onClick={() => fileRef.current?.click()}
            >
              {t('settings.backupImport')}
            </Button>
          </div>

          <div className="mt-2.5 flex gap-2 items-center">
            <span className="text-[11px] font-semibold text-muted-foreground">
              {t('settings.importMode')}
            </span>
            <div className="flex gap-1 p-0.5 bg-muted rounded-md">
              <button
                onClick={() => setImportMode('merge')}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-bold rounded',
                  importMode === 'merge' ? 'bg-card shadow-token-sm' : 'text-muted-foreground',
                )}
              >
                {t('settings.importMerge')}
              </button>
              <button
                onClick={() => setImportMode('replace')}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-bold rounded',
                  importMode === 'replace' ? 'bg-card shadow-token-sm' : 'text-muted-foreground',
                )}
              >
                {t('settings.importReplace')}
              </button>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFile}
          />
        </Card>
      </div>

      {/* Install — only shown if there's an actionable path and not yet installed */}
      {showInstallRow && (
        <SettingsGroup label={t('settings.groupInstall')}>
          <SettingsRow
            icon={<Smartphone size={18} />}
            title={t('install.title')}
            subtitle={
              install.canPrompt ? t('install.subtitleAndroid') : t('install.subtitleIos')
            }
            onClick={handleInstallClick}
            chevron
          />
        </SettingsGroup>
      )}

      {/* Display */}
      <SettingsGroup label={t('settings.groupDisplay')}>
        <SettingsRow
          icon={darkMode ? <Moon size={18} /> : <Sun size={18} />}
          title={t('settings.theme')}
        >
          <SegmentedControl
            value={darkMode ? 'dark' : 'light'}
            onChange={() => handleToggleDark()}
            options={[
              { id: 'light', label: t('settings.themeLight') },
              { id: 'dark', label: t('settings.themeDark') },
            ]}
          />
        </SettingsRow>
        <SettingsRow icon={<Globe size={18} />} title={t('settings.language')}>
          <SegmentedControl
            value={locale}
            onChange={(v) => handleLang(v as Locale)}
            options={[
              { id: 'de', label: 'DE' },
              { id: 'en', label: 'EN' },
            ]}
          />
        </SettingsRow>
      </SettingsGroup>

      {/* Data */}
      <SettingsGroup label={t('settings.groupData')}>
        <SettingsRow
          icon={<Layers size={18} />}
          title={t('settings.exportCollection')}
          subtitle={t('settings.exportSubtitle')}
          onClick={handleDownload}
          chevron
        />
        <SettingsRow
          icon={<RefreshCw size={18} />}
          title={t('settings.onboardingReplay')}
          subtitle={t('settings.onboardingReplayDesc')}
          onClick={() => navigate('/onboarding')}
          chevron
        />
        <SettingsRow
          icon={<AlertCircle size={18} />}
          title={t('settings.reset')}
          subtitle={t('settings.resetDesc')}
          danger
          onClick={handleReset}
          chevron
        />
      </SettingsGroup>

      {/* About */}
      <SettingsGroup label={t('settings.groupApp')}>
        <SettingsRow
          icon={<Info size={18} />}
          title={t('settings.about')}
          subtitle={t('settings.aboutSubtitle')}
          onClick={() => navigate('/about')}
          chevron
        />
      </SettingsGroup>

      <div className="px-5 pt-6 pb-4 text-center">
        <div className="text-[11px] text-muted-foreground opacity-80">
          {t('settings.footer')}
          {' · '}
          <a
            href="https://www.lukashuettis.de/impressum"
            target="_blank"
            rel="noreferrer noopener"
            className="underline hover:text-foreground"
          >
            {t('settings.impressum')}
          </a>
        </div>
      </div>

      <InstallSheet open={iosSheetOpen} onClose={() => setIosSheetOpen(false)} />
    </div>
  )
}

function SettingsGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-5 pt-5">
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 pl-1">
        {label}
      </div>
      <Card padded={false} className="overflow-hidden">
        {children}
      </Card>
    </div>
  )
}

interface SettingsRowProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children?: React.ReactNode
  chevron?: boolean
  danger?: boolean
  onClick?: () => void
}

function SettingsRow({ icon, title, subtitle, children, chevron, danger, onClick }: SettingsRowProps) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 min-h-14 text-left',
        danger ? 'text-destructive' : 'text-foreground',
        onClick && 'cursor-pointer active:bg-muted',
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          danger ? 'bg-destructive/10' : 'bg-muted',
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        {subtitle && (
          <div className={cn('text-xs opacity-80', danger ? 'text-destructive' : 'text-muted-foreground')}>
            {subtitle}
          </div>
        )}
      </div>
      {children}
      {chevron && <ChevronRight size={18} className="text-muted-foreground" />}
    </Wrapper>
  )
}

interface SegOption {
  id: string
  label: string
}

function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: SegOption[]
}) {
  return (
    <div className="flex bg-muted p-0.5 rounded-lg gap-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'h-8 px-3 rounded-md text-xs font-semibold flex items-center gap-1 transition-all',
            value === o.id ? 'bg-card text-foreground shadow-token-sm' : 'text-muted-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
