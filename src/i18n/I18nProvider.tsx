import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { interpolate, MESSAGES, type Locale, type MessageKey } from './messages'

interface I18nValue {
  locale: Locale
  setLocale: (l: Locale) => void
  /** Translate. `t('dashboard.title')` or `t('packs.summary', { n: 12, price: '63 €' })` */
  t: (key: MessageKey, params?: Record<string, string | number>) => string
  /** Intl-locale tag (de-DE / en-US) suitable for Date/Number formatting */
  intlLocale: string
}

const I18nContext = createContext<I18nValue | null>(null)

const LS_KEY = 'locale'

function detectInitialLocale(): Locale {
  // 1. Explicit user choice in localStorage wins
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(LS_KEY)
    if (saved === 'de' || saved === 'en') return saved
  }
  // 2. Browser preference — anything that starts with "de" is German
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en'
  }
  return 'de'
}

const INTL_TAGS: Record<Locale, string> = {
  de: 'de-DE',
  en: 'en-US',
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectInitialLocale())

  // Sync to localStorage + <html lang>
  useEffect(() => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(LS_KEY, locale)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', locale)
    }
  }, [locale])

  const setLocale = useCallback((l: Locale) => setLocaleState(l), [])

  const value = useMemo<I18nValue>(() => {
    const dict = MESSAGES[locale]
    return {
      locale,
      setLocale,
      intlLocale: INTL_TAGS[locale],
      t: (key, params) => {
        const template = dict[key] ?? MESSAGES.de[key] ?? key
        return interpolate(template, params)
      },
    }
  }, [locale, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

// eslint-disable-next-line react-refresh/only-export-components
export function useT() {
  return useI18n().t
}
