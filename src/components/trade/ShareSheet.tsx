import { lazy, Suspense, useMemo, useState } from 'react'
import { Share2, Copy, QrCode, FileText, ChevronRight } from 'lucide-react'
import { BottomSheet } from '../ui/BottomSheet'
import { buildShareUrl } from '@/lib/tradeCheckUrl'
import { KIND_LIST } from '@/lib/tradeCheckCodec'
import { shareText, copyToClipboard, generateWhatsAppText } from '@/lib/export'
import type { SeekOfferLists } from '@/lib/export'
import { useT } from '@/i18n/I18nProvider'
import { useToast } from '@/components/ui/Toast'

const QRDisplay = lazy(() =>
  import('./QRDisplay').then((m) => ({ default: m.QRDisplay })),
)

interface ShareSheetProps {
  open: boolean
  onClose: () => void
  /** lists already computed by TradePage — we just consume them */
  lists: SeekOfferLists
}

export function ShareSheet({ open, onClose, lists }: ShareSheetProps) {
  const t = useT()
  const { show } = useToast()
  const [qrOpen, setQrOpen] = useState(false)

  const url = useMemo(() => {
    const seek = lists.seek.flatMap((g) => g.items.map((s) => s.id))
    const offer = lists.offer.flatMap((g) =>
      g.items.map((s) => ({ id: s.id, dups: g.dupCounts.get(s.id) ?? 1 })),
    )
    if (seek.length === 0 && offer.length === 0) return null
    return buildShareUrl({ kind: KIND_LIST, seek, offer })
  }, [lists])

  const isEmpty = url === null

  const handleNativeShare = async () => {
    if (!url) {
      show(t('tradecheck.share.empty'), 'info')
      return
    }
    const body = t('tradecheck.share.body', { url })
    const res = await shareText({ title: t('tradecheck.share.title'), text: body })
    if (res.method === 'native') show(t('trade.sharedNative'), 'success')
    else if (res.method === 'clipboard') show(t('trade.sharedClipboard'), 'success')
    else if (res.method === 'failed') show(t('trade.shareFailed'), 'error')
  }

  const handleCopyLink = async () => {
    if (!url) {
      show(t('tradecheck.share.empty'), 'info')
      return
    }
    const ok = await copyToClipboard(url)
    show(
      ok ? t('tradecheck.share.linkCopied') : t('trade.whatsappCopyFailed'),
      ok ? 'success' : 'error',
    )
  }

  const handleCopyText = async () => {
    if (lists.totalSeek === 0 && lists.totalOffer === 0) {
      show(t('tradecheck.share.empty'), 'info')
      return
    }
    const text = generateWhatsAppText(lists, {
      listTitle: t('trade.exportListTitle'),
      seekHeader: (n) => t('trade.exportSeek', { n }),
      offerHeader: (n) => t('trade.exportOffer', { n }),
      empty: t('trade.exportEmpty'),
      footer: (url2) => t('trade.exportFooter', { url: url2 }),
    })
    const ok = await copyToClipboard(text)
    show(
      ok ? t('tradecheck.share.textCopied') : t('trade.whatsappCopyFailed'),
      ok ? 'success' : 'error',
    )
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose}>
        <div className="pt-1 pb-2">
          <h2 className="text-lg font-extrabold m-0 mb-1">
            {t('tradecheck.share.title')}
          </h2>
          <p className="text-xs text-muted-foreground m-0 mb-4">
            {t('tradecheck.share.subtitle')}
          </p>
          <div className="space-y-2">
            <Row
              icon={<Share2 size={20} />}
              title={t('tradecheck.share.whatsapp')}
              onClick={handleNativeShare}
              disabled={isEmpty}
            />
            <Row
              icon={<Copy size={20} />}
              title={t('tradecheck.share.copyLink')}
              onClick={handleCopyLink}
              disabled={isEmpty}
            />
            <Row
              icon={<QrCode size={20} />}
              title={t('tradecheck.share.qr')}
              onClick={() => {
                if (isEmpty) {
                  show(t('tradecheck.share.empty'), 'info')
                  return
                }
                setQrOpen(true)
              }}
              disabled={isEmpty}
            />
            <Row
              icon={<FileText size={20} />}
              title={t('tradecheck.share.copyText')}
              onClick={handleCopyText}
              disabled={lists.totalSeek === 0 && lists.totalOffer === 0}
            />
          </div>
        </div>
      </BottomSheet>

      {qrOpen && url && (
        <Suspense fallback={null}>
          <QRDisplay open={qrOpen} onClose={() => setQrOpen(false)} url={url} />
        </Suspense>
      )}
    </>
  )
}

function Row({
  icon,
  title,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  title: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-3 py-3.5 bg-card border border-border rounded-xl hover:bg-muted active:scale-[0.99] transition-all text-left disabled:opacity-50"
    >
      <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary-soft-foreground flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 text-sm font-bold">{title}</div>
      <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />
    </button>
  )
}
