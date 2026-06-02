import { encodePayload, KIND_LIST, KIND_PROPOSAL } from './tradeCheckCodec'
import type { EncodeInput, PayloadKind } from './tradeCheckCodec'

/**
 * Build a sharable URL pointing at the TradeCheckPage with the encoded
 * payload sitting in the hash fragment. We use the current window origin
 * + pathname so the link works on whatever base path the app is hosted on
 * (GitHub Pages uses /stickerlog/).
 */
export function buildShareUrl(input: EncodeInput): string {
  const payload = encodePayload(input)
  const baseUrl = window.location.origin + window.location.pathname
  return `${baseUrl}#/trade/check/${payload}`
}

export interface ProposalText {
  /** What the OTHER person receives — these are MY out-items */
  youGet: string[]
  /** What the OTHER person gives — these are MY in-items */
  iGet: string[]
  url: string
}

/**
 * Build a human-readable WhatsApp text for a concrete proposal that
 * accompanies the share URL. Pure, no DOM access — caller substitutes
 * via i18n template (`tradecheck.proposal.shareBody`).
 */
export function buildProposalText(
  template: string,
  text: ProposalText,
): string {
  return template
    .replace('{youGet}', text.youGet.join(', ') || '—')
    .replace('{iGet}', text.iGet.join(', ') || '—')
    .replace('{url}', text.url)
}

export { KIND_LIST, KIND_PROPOSAL }
export type { PayloadKind, EncodeInput }
