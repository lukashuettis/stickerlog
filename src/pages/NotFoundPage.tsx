import { useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TopBar } from '@/components/ui/TopBar'
import { useT } from '@/i18n/I18nProvider'

/**
 * Generic 404. Reached via the `*` catch-all route in App.tsx — covers both
 * mistyped hash URLs and stale links shared from older app versions.
 */
export function NotFoundPage() {
  const t = useT()
  const navigate = useNavigate()

  return (
    <div>
      <TopBar title={t('notFound.title')} />
      <div className="px-4 py-6 lg:px-0 lg:py-0">
        <Card className="p-6 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary-soft-foreground flex items-center justify-center mx-auto mb-4">
            <Compass size={28} strokeWidth={2} />
          </div>
          <h2 className="text-lg font-bold mb-1">{t('notFound.title')}</h2>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            {t('notFound.body')}
          </p>
          <Button onClick={() => navigate('/', { replace: true })}>
            {t('notFound.cta')}
          </Button>
        </Card>
      </div>
    </div>
  )
}
