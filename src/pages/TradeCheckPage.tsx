import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Send,
  Check,
  Copy,
  AlertTriangle,
  Inbox,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TopBar } from '@/components/ui/TopBar'
import { IconBtn } from '@/components/ui/IconBtn'
import { BrandMark } from '@/components/ui/Brand'
import { useToast } from '@/components/ui/Toast'
import {
  decodePayload,
  CodecError,
  KIND_PROPOSAL,
  type DecodedPayload,
} from '@/lib/tradeCheckCodec'
import { matchSides, type MatchEmotion } from '@/lib/tradeCheckMatch'
import { useOwnedMap, useSetting } from '@/hooks/useCollection'
import {
  createTradeEvent,
  findLastCopies,
  NegativeStockError,
} from '@/lib/db'
import { buildShareUrl, buildProposalText } from '@/lib/tradeCheckUrl'
import { shareText, copyToClipboard } from '@/lib/export'
import { savePendingPayload, clearPendingPayload } from '@/lib/pendingPayload'
import { useT, useI18n } from '@/i18n/I18nProvider'
import { isStandalone, isIOS } from '@/lib/ios-pwa'
import { findStickerByCode } from '@/data/album'
import { findTeamByCode, teamName } from '@/data/teams'
import { cn } from '@/lib/cn'
import type { MessageKey } from '@/i18n/messages'

type ParseState =
  | { kind: 'error'; code: string }
  | { kind: 'ok'; decoded: DecodedPayload }

export function TradeCheckPage() {
  const t = useT()
  const { locale } = useI18n()
  const navigate = useNavigate()
  const { payload } = useParams<{ payload: string }>()
  const ownedMap = useOwnedMap('album')
  const { show } = useToast()

  const parseState: ParseState = useMemo(() => {
    if (!payload) return { kind: 'error', code: 'truncated' }
    try {
      const decoded = decodePayload(payload)
      return { kind: 'ok', decoded }
    } catch (e) {
      if (e instanceof CodecError) return { kind: 'error', code: e.code }
      return { kind: 'error', code: 'truncated' }
    }
  }, [payload])

  const ownedCount = Object.keys(ownedMap).length
  const isPublicMode = ownedCount === 0

  // Has the user finished onboarding already? Drives the public-mode CTA:
  // someone who's never installed the app should go through onboarding,
  // someone who already has but still has no stickers should jump straight
  // to the capture screen.
  const onboardingDone = useSetting<boolean>('onboardingCompleted', false)

  // Stash pending payload for new users so they can come back later.
  useEffect(() => {
    if (parseState.kind === 'ok' && isPublicMode && payload) {
      savePendingPayload(payload)
    }
  }, [parseState, isPublicMode, payload])

  // Matched mode consumes the pending payload — but only as a side effect,
  // never during render. Eslint's react-hooks/purity catches direct calls.
  useEffect(() => {
    if (parseState.kind === 'ok' && !isPublicMode) {
      clearPendingPayload()
    }
  }, [parseState, isPublicMode])

  if (parseState.kind === 'error') {
    return <ErrorView code={parseState.code} onBack={() => navigate('/trade')} />
  }

  const decoded = parseState.decoded

  if (isPublicMode) {
    return (
      <PublicView
        decoded={decoded}
        onboardingDone={onboardingDone === true}
        currentUrl={typeof window !== 'undefined' ? window.location.href : ''}
        onCopyLink={async () => {
          const ok = await copyToClipboard(window.location.href)
          show(
            ok ? t('tradecheck.share.linkCopied') : t('trade.whatsappCopyFailed'),
            ok ? 'success' : 'error',
          )
        }}
      />
    )
  }

  return (
    <MatchedView
      decoded={decoded}
      ownedMap={ownedMap}
      navigate={(p) => navigate(p)}
      show={(m, type) => show(m, type)}
      t={t}
      locale={locale}
      payload={payload!}
    />
  )
}

// ─── ErrorView ───────────────────────────────────────────────────────────

function ErrorView({ code, onBack }: { code: string; onBack: () => void }) {
  const t = useT()
  const isVersion = code === 'unsupported_version'
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        large
        title={isVersion ? t('tradecheck.error.versionTitle') : t('tradecheck.error.title')}
        left={
          <IconBtn
            icon={<ArrowLeft size={22} />}
            onClick={onBack}
            label={t('common.back')}
          />
        }
      />
      <div className="px-5 pt-3 lg:px-8 lg:max-w-2xl lg:mx-auto">
        <Card className="p-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={24} />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground mb-4">
            {isVersion ? t('tradecheck.error.versionBody') : t('tradecheck.error.body')}
          </p>
          <Button onClick={onBack}>{t('tradecheck.result.noneCta')}</Button>
        </Card>
      </div>
    </div>
  )
}

// ─── PublicView ──────────────────────────────────────────────────────────
// Chrome-less, focused. Adapts to list vs. proposal payload kind.

function PublicView({
  decoded,
  onboardingDone,
  currentUrl,
  onCopyLink,
}: {
  decoded: DecodedPayload
  onboardingDone: boolean
  currentUrl: string
  onCopyLink: () => void
}) {
  const t = useT()
  const navigate = useNavigate()
  const isProposal = decoded.kind === KIND_PROPOSAL
  // Tab default: prefer the offered side (most actionable for the receiver),
  // but flip to "seek" for one-sided payloads where offer is empty — otherwise
  // the recipient lands on a blank tab.
  const [tab, setTab] = useState<'seek' | 'offer'>(() =>
    decoded.offer.length === 0 && decoded.seek.length > 0 ? 'seek' : 'offer',
  )
  // iOS Safari outside standalone is the case where the storage isolation
  // really bites. Don't dump the hint on every browser.
  const showIosHint = isIOS() && !isStandalone()

  // Tabs / labels switch by kind.
  const tabOfferLabel = isProposal
    ? t('tradecheck.public.proposalYouGet', { n: decoded.offer.length })
    : t('tradecheck.public.tabOffer', { n: decoded.offer.length })
  const tabSeekLabel = isProposal
    ? t('tradecheck.public.proposalYouGive', { n: decoded.seek.length })
    : t('tradecheck.public.tabSeek', { n: decoded.seek.length })

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Focused header with brand mark + back button */}
      <header className="px-5 pt-5 pb-3 flex items-center gap-3 max-w-2xl mx-auto w-full">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label={t('common.back')}
          className="w-9 h-9 rounded-full bg-muted text-foreground inline-flex items-center justify-center bg-transparent border-none flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <BrandMark size={28} className="text-foreground flex-shrink-0" />
        <h1 className="text-base font-extrabold m-0 truncate">
          {isProposal ? t('tradecheck.public.proposalTitle') : t('tradecheck.public.title')}
        </h1>
      </header>

      <main className="flex-1 px-5 pb-10 space-y-3 max-w-2xl mx-auto w-full">
        <Card className="p-4">
          <p className="text-[15px] font-medium m-0">
            {isProposal
              ? t('tradecheck.public.proposalSummary')
              : t('tradecheck.public.summary', {
                  offer: decoded.offer.length,
                  seek: decoded.seek.length,
                })}
          </p>
        </Card>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-xl">
          <button
            type="button"
            onClick={() => setTab('offer')}
            className={cn(
              'h-10 rounded-[9px] text-sm font-bold transition-colors',
              tab === 'offer'
                ? 'bg-card text-foreground shadow-token-sm'
                : 'bg-transparent text-muted-foreground',
            )}
          >
            {tabOfferLabel}
          </button>
          <button
            type="button"
            onClick={() => setTab('seek')}
            className={cn(
              'h-10 rounded-[9px] text-sm font-bold transition-colors',
              tab === 'seek'
                ? 'bg-card text-foreground shadow-token-sm'
                : 'bg-transparent text-muted-foreground',
            )}
          >
            {tabSeekLabel}
          </button>
        </div>

        <GroupedStickerList
          ids={tab === 'seek' ? decoded.seek : decoded.offer.map((o) => o.id)}
          variant={tab}
          dupMap={
            tab === 'offer'
              ? new Map(decoded.offer.map((o) => [o.id, o.dups] as const))
              : undefined
          }
        />

        {/* Single primary CTA + supporting text.
            Onboarding-aware: a user who already finished onboarding skips
            it and jumps to the capture screen — sending them through the
            slides again would be silly. */}
        <div className="pt-3 space-y-2">
          <Button
            size="md"
            full
            onClick={() => navigate(onboardingDone ? '/scan' : '/onboarding')}
          >
            {t(
              onboardingDone
                ? 'tradecheck.public.firstStickerCta'
                : 'tradecheck.public.startCta',
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center leading-snug m-0">
            {t(
              onboardingDone
                ? 'tradecheck.public.firstStickerBody'
                : 'tradecheck.public.startBody',
            )}
          </p>
        </div>

        {/* Secondary install-hint for iOS Safari only — placed last and quiet */}
        {showIosHint && (
          <Card className="p-3.5 mt-3">
            <div className="flex items-start gap-2.5 mb-2.5">
              <Inbox size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold leading-tight">
                  {t('tradecheck.public.iosHintTitle')}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {t('tradecheck.public.iosHintBody')}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" icon={<Copy size={14} />} onClick={onCopyLink}>
              {t('tradecheck.public.copyLink')}
            </Button>
          </Card>
        )}

        {/* Hidden under the fold: the raw URL — useful for "view source" inspection */}
        <div className="sr-only">{currentUrl}</div>
      </main>
    </div>
  )
}

// ─── MatchedView ─────────────────────────────────────────────────────────

function MatchedView({
  decoded,
  ownedMap,
  navigate,
  show,
  t,
  locale,
  payload,
}: {
  decoded: DecodedPayload
  ownedMap: Record<string, number>
  navigate: (p: string) => void
  show: (msg: string, type?: 'success' | 'error' | 'info') => void
  t: ReturnType<typeof useT>
  locale: 'de' | 'en'
  payload: string
}) {
  const ownedCountMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const [id, c] of Object.entries(ownedMap)) m.set(id, c)
    return m
  }, [ownedMap])

  const result = useMemo(
    () =>
      matchSides(
        { seek: decoded.seek, offer: decoded.offer },
        { ownedCount: ownedCountMap },
      ),
    [decoded, ownedCountMap],
  )

  const [selectedForMe, setSelectedForMe] = useState<Set<string>>(
    () => new Set(result.forMe.map((e) => e.id)),
  )
  const [selectedForThem, setSelectedForThem] = useState<Set<string>>(
    () => new Set(result.forThem.map((e) => e.id)),
  )

  const toggleSel = (set: Set<string>, id: string, setFn: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setFn(next)
  }

  const [irrelevantOpen, setIrrelevantOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [counterparty, setCounterparty] = useState('')
  const [notes, setNotes] = useState('')
  const [lastCopiesWarn, setLastCopiesWarn] = useState<string[] | null>(null)

  const handleProposeShare = async () => {
    const iGet = Array.from(selectedForMe)
    const youGet = Array.from(selectedForThem)
    if (iGet.length === 0 && youGet.length === 0) {
      show(t('tradecheck.proposal.shareEmpty'), 'info')
      return
    }
    const url = buildShareUrl({
      kind: KIND_PROPOSAL,
      seek: iGet,
      offer: youGet.map((id) => ({ id, dups: 1 })),
    })
    const body = buildProposalText(t('tradecheck.proposal.shareBody'), {
      youGet,
      iGet,
      url,
    })
    const res = await shareText({ title: t('tradecheck.proposal.title'), text: body })
    if (res.method === 'native') show(t('trade.sharedNative'), 'success')
    else if (res.method === 'clipboard') show(t('trade.sharedClipboard'), 'success')
    else if (res.method === 'failed') show(t('trade.shareFailed'), 'error')
  }

  const openSaveDialog = async () => {
    const outIds = Array.from(selectedForThem)
    if (selectedForMe.size === 0 && selectedForThem.size === 0) {
      show(t('tradecheck.proposal.shareEmpty'), 'info')
      return
    }
    if (outIds.length > 0) {
      const last = await findLastCopies('album', outIds)
      if (last.length > 0) {
        setLastCopiesWarn(last)
        return
      }
    }
    setSaveOpen(true)
  }

  const confirmSave = async () => {
    try {
      const inItems = Array.from(selectedForMe).map((id) => ({
        catalog: 'album' as const,
        id,
      }))
      const outItems = Array.from(selectedForThem).map((id) => ({
        catalog: 'album' as const,
        id,
      }))
      await createTradeEvent({
        inItems,
        outItems,
        counterparty: counterparty.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      show(
        t('tradecheck.complete.saved', {
          inN: inItems.length,
          outN: outItems.length,
        }),
        'success',
      )
      navigate('/trade')
    } catch (e) {
      if (e instanceof NegativeStockError) {
        show(
          t('tradecheck.complete.errorStock', { ids: e.stickerIds.join(', ') }),
          'error',
        )
      } else {
        show(t('common.delete'), 'error')
      }
    } finally {
      setSaveOpen(false)
      setLastCopiesWarn(null)
    }
  }

  const emotionKey: MessageKey =
    decoded.kind === KIND_PROPOSAL
      ? 'tradecheck.proposal.title'
      : (`tradecheck.result.emotion.${emotionCamelKey(result.emotion)}` as MessageKey)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar
        large
        title={
          decoded.kind === KIND_PROPOSAL
            ? t('tradecheck.proposal.title')
            : t('tradecheck.result.title')
        }
        left={
          <IconBtn
            icon={<ArrowLeft size={22} />}
            onClick={() => navigate('/trade')}
            label={t('common.back')}
          />
        }
      />

      <div
        className="px-5 lg:px-8 lg:max-w-3xl lg:mx-auto pt-3 space-y-3"
        style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom))' }}
      >
        {/* Summary card */}
        <Card className="p-5 text-center">
          <h2 className="text-xl font-extrabold m-0 mb-1.5 tracking-tight">
            {t(emotionKey)}
          </h2>
          <p className="text-sm text-muted-foreground m-0">
            {decoded.kind === KIND_PROPOSAL
              ? t('tradecheck.proposal.summary', {
                  youGet: result.forMe.length,
                  youGive: result.forThem.length,
                })
              : t('tradecheck.result.summary', {
                  forMe: result.forMe.length,
                  forThem: result.forThem.length,
                })}
          </p>
        </Card>

        {result.forMe.length > 0 && (
          <Card padded={false} className="overflow-hidden">
            <SectionHeader
              label={
                decoded.kind === KIND_PROPOSAL
                  ? t('tradecheck.proposal.youGet', { n: result.forMe.length })
                  : t('tradecheck.result.forMe', { n: result.forMe.length })
              }
              tone="primary"
            />
            <div className="divide-y divide-border">
              {result.forMe.map((entry) => (
                <Row
                  key={entry.id}
                  id={entry.id}
                  checked={selectedForMe.has(entry.id)}
                  onToggle={() => toggleSel(selectedForMe, entry.id, setSelectedForMe)}
                  suffix={
                    entry.theirDups > 1
                      ? t('tradecheck.result.theyHave', { n: entry.theirDups })
                      : undefined
                  }
                  locale={locale}
                />
              ))}
            </div>
          </Card>
        )}

        {result.forThem.length > 0 && (
          <Card padded={false} className="overflow-hidden">
            <SectionHeader
              label={
                decoded.kind === KIND_PROPOSAL
                  ? t('tradecheck.proposal.youGive', { n: result.forThem.length })
                  : t('tradecheck.result.forThem', { n: result.forThem.length })
              }
              tone="destructive"
            />
            <div className="divide-y divide-border">
              {result.forThem.map((entry) => (
                <Row
                  key={entry.id}
                  id={entry.id}
                  checked={selectedForThem.has(entry.id)}
                  onToggle={() => toggleSel(selectedForThem, entry.id, setSelectedForThem)}
                  suffix={
                    entry.myDups > 1
                      ? t('tradecheck.result.youHave', { n: entry.myDups })
                      : undefined
                  }
                  locale={locale}
                />
              ))}
            </div>
          </Card>
        )}

        {(result.alreadyHave.length > 0 || result.cantOffer.length > 0) && (
          <Card padded={false} className="overflow-hidden">
            <button
              type="button"
              onClick={() => setIrrelevantOpen((v) => !v)}
              className="w-full px-4 py-3 flex items-center gap-2 text-left bg-muted text-muted-foreground hover:bg-muted/80 border-none"
            >
              <span className="text-xs font-bold uppercase tracking-wider flex-1">
                {t('tradecheck.result.irrelevant', {
                  n: result.alreadyHave.length + result.cantOffer.length,
                })}
              </span>
              {irrelevantOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {irrelevantOpen && (
              <div className="p-3 space-y-3 text-xs">
                {result.alreadyHave.length > 0 && (
                  <div>
                    <div className="text-muted-foreground font-semibold mb-1">
                      {t('tradecheck.result.alreadyHave', { n: result.alreadyHave.length })}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.alreadyHave.map((id) => (
                        <CodeChip key={id} id={id} variant="muted" />
                      ))}
                    </div>
                  </div>
                )}
                {result.cantOffer.length > 0 && (
                  <div>
                    <div className="text-muted-foreground font-semibold mb-1">
                      {t('tradecheck.result.cantOffer', { n: result.cantOffer.length })}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.cantOffer.map((id) => (
                        <CodeChip key={id} id={id} variant="muted" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {result.forMe.length === 0 && result.forThem.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground m-0">
              {t('tradecheck.result.emotion.none')}
            </p>
          </Card>
        )}
      </div>

      {/* Sticky CTA bar — chrome-less route, so we sit clean at the bottom
          with safe-area padding. Buttons may wrap to two lines but share a
          consistent min-height so there's no layout shift. */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 bg-card/95 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="px-4 py-3 lg:px-8 lg:max-w-3xl lg:mx-auto grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="md"
            icon={<Send size={18} />}
            onClick={handleProposeShare}
            className="min-h-12 leading-tight whitespace-normal"
          >
            {t('tradecheck.result.propose')}
          </Button>
          <Button
            size="md"
            icon={<Check size={18} />}
            onClick={openSaveDialog}
            className="min-h-12 leading-tight whitespace-normal"
          >
            {t('tradecheck.result.complete')}
          </Button>
        </div>
      </div>

      {(saveOpen || lastCopiesWarn) && (
        <div
          className="fixed inset-0 bg-black/40 z-40 animate-fade-in flex items-end lg:items-center justify-center"
          onClick={() => {
            setSaveOpen(false)
            setLastCopiesWarn(null)
          }}
        >
          <div
            className="bg-card rounded-t-3xl lg:rounded-2xl px-5 pt-5 pb-7 w-full lg:max-w-md max-h-[90vh] overflow-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom))' }}
          >
            {lastCopiesWarn ? (
              <>
                <h2 className="text-lg font-extrabold m-0 mb-2">
                  {t('tradecheck.complete.warnLastTitle')}
                </h2>
                <p className="text-sm text-muted-foreground m-0 mb-4">
                  {t('tradecheck.complete.warnLastBody', {
                    ids: lastCopiesWarn.join(', '),
                  })}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setLastCopiesWarn(null)}>
                    {t('tradecheck.complete.cancel')}
                  </Button>
                  <Button
                    onClick={() => {
                      setLastCopiesWarn(null)
                      setSaveOpen(true)
                    }}
                  >
                    {t('tradecheck.complete.confirm')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-extrabold m-0 mb-3">
                  {t('tradecheck.complete.title')}
                </h2>
                <div className="text-xs space-y-2 mb-4">
                  <div>
                    <div className="text-muted-foreground font-semibold mb-1">
                      {t('tradecheck.complete.youGet', { n: selectedForMe.size })}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(selectedForMe).map((id) => (
                        <CodeChip key={id} id={id} variant="primary" />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-semibold mb-1">
                      {t('tradecheck.complete.youGive', { n: selectedForThem.size })}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(selectedForThem).map((id) => (
                        <CodeChip key={id} id={id} variant="destructive" />
                      ))}
                    </div>
                  </div>
                </div>
                <label className="block mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    {t('tradecheck.complete.counterparty')}
                  </span>
                  <input
                    type="text"
                    value={counterparty}
                    onChange={(e) => setCounterparty(e.target.value)}
                    placeholder={t('tradecheck.complete.counterpartyPh')}
                    className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-sm"
                  />
                </label>
                <label className="block mb-4">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                    {t('tradecheck.complete.notes')}
                  </span>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('tradecheck.complete.notesPh')}
                    className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-sm"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setSaveOpen(false)}>
                    {t('tradecheck.complete.cancel')}
                  </Button>
                  <Button onClick={confirmSave}>{t('tradecheck.complete.confirm')}</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <input type="hidden" value={payload} />
    </div>
  )
}

// ─── Small atoms ─────────────────────────────────────────────────────────

function SectionHeader({
  label,
  tone,
}: {
  label: string
  tone: 'primary' | 'destructive'
}) {
  return (
    <div
      className={cn(
        'px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b border-border',
        tone === 'primary'
          ? 'bg-primary-soft text-primary-soft-foreground'
          : 'bg-destructive/10 text-destructive',
      )}
    >
      {label}
    </div>
  )
}

function Row({
  id,
  checked,
  onToggle,
  suffix,
  locale,
}: {
  id: string
  checked: boolean
  onToggle: () => void
  suffix?: string
  locale: 'de' | 'en'
}) {
  const slot = findStickerByCode(id)
  const team = slot ? findTeamByCode(slot.teamCode) : undefined
  const teamLabel = team ? teamName(team, locale) : ''
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted bg-transparent border-none"
    >
      <span
        className={cn(
          'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0',
          checked ? 'bg-primary border-primary text-white' : 'border-muted-foreground',
        )}
      >
        {checked && <Check size={12} strokeWidth={4} />}
      </span>
      <span className="numeric text-sm font-bold">{id}</span>
      {teamLabel && (
        <span className="text-xs text-muted-foreground">· {teamLabel}</span>
      )}
      {suffix && <span className="ml-auto text-xs text-muted-foreground">{suffix}</span>}
    </button>
  )
}

function CodeChip({
  id,
  variant,
}: {
  id: string
  variant: 'primary' | 'destructive' | 'muted'
}) {
  return (
    <span
      className={cn(
        'numeric text-xs font-bold px-2 py-1 rounded-md border',
        variant === 'primary' && 'bg-primary-soft text-primary-soft-foreground border-primary/30',
        variant === 'destructive' && 'bg-destructive/10 text-destructive border-destructive/20',
        variant === 'muted' && 'bg-muted text-muted-foreground border-border',
      )}
    >
      {id}
    </span>
  )
}

/**
 * Long sticker lists chunked by team. For short lists we just inline; for
 * larger ones we collapse to the first N per team with "+rest weitere".
 */
function GroupedStickerList({
  ids,
  variant,
  dupMap,
}: {
  ids: string[]
  variant: 'seek' | 'offer'
  dupMap?: Map<string, number>
}) {
  const t = useT()
  const { locale } = useI18n()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const groups = useMemo(() => {
    const byTeam = new Map<string, string[]>()
    for (const id of ids) {
      const slot = findStickerByCode(id)
      const code = slot?.teamCode ?? 'XXX'
      const list = byTeam.get(code) ?? []
      list.push(id)
      byTeam.set(code, list)
    }
    return Array.from(byTeam.entries()).map(([code, list]) => ({
      team: findTeamByCode(code),
      code,
      ids: list,
    }))
  }, [ids])

  if (ids.length === 0) {
    return <Card className="p-4 text-center text-sm text-muted-foreground">—</Card>
  }

  const CHIPS_BEFORE_FOLD = 12

  return (
    <div className="space-y-2">
      {groups.map(({ team, code, ids: groupIds }) => {
        const isOpen = expanded.has(code)
        const visible = isOpen ? groupIds : groupIds.slice(0, CHIPS_BEFORE_FOLD)
        const overflow = groupIds.length - visible.length
        const label = team ? teamName(team, locale) : code
        return (
          <Card key={code} padded={false} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-muted">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
                {label}
              </span>
              <span className="text-[11px] font-bold text-muted-foreground numeric flex-shrink-0">
                {groupIds.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-3">
              {visible.map((id) => {
                const dup = dupMap?.get(id)
                return (
                  <span
                    key={id}
                    className={cn(
                      'numeric text-xs font-bold px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 border',
                      variant === 'seek'
                        ? 'bg-destructive/10 text-destructive border-destructive/20'
                        : 'bg-primary-soft text-primary-soft-foreground border-primary/30',
                    )}
                  >
                    {id}
                    {dup && dup > 1 && <span className="opacity-70">×{dup}</span>}
                  </span>
                )
              })}
              {overflow > 0 && !isOpen && (
                <button
                  type="button"
                  onClick={() => {
                    const next = new Set(expanded)
                    next.add(code)
                    setExpanded(next)
                  }}
                  className="text-xs font-semibold text-primary bg-transparent border-none px-1 py-1.5"
                >
                  {t('trade.moreCount', { n: overflow })}
                </button>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function emotionCamelKey(e: MatchEmotion): string {
  switch (e) {
    case 'great':
      return 'great'
    case 'good':
      return 'good'
    case 'one_sided_me':
      return 'oneSidedMe'
    case 'one_sided_them':
      return 'oneSidedThem'
    case 'none':
      return 'none'
  }
}
