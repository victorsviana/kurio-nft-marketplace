import Big from 'big.js'
import type { Quote, QuoteIssue } from '@/shared/contracts'
import { formatEth } from '@/shared/lib/format'

/**
 * Client side of the stale-quote rule (RT-09, CHK-05). Mirrors the server's `quoteChanged`:
 * a quote is "the same" when every value the user agreed to is the same. Ids, timestamps and
 * issues never count (every refetch has a new id), and the raw stock count does not either
 * (50 → 49 units left does not change what the user is buying); only "sold out" and
 * "not enough units" do.
 */
const money = (value: string) => new Big(value).toString()

export function quoteSignature(quote: Quote): string {
  return JSON.stringify({
    network: quote.network,
    lines: quote.items.map((line) => [
      line.itemId,
      money(line.unitPrice),
      line.quantity,
      line.available === 0,
      line.quantity > line.available,
    ]),
    discount: money(quote.discount),
    coupon: quote.coupon ? `${quote.coupon.code}:${quote.coupon.status}` : null,
    fee: money(quote.networkFee),
    total: money(quote.total),
    purchasable: quote.purchasable,
  })
}

const eth = (value: string) => {
  try {
    return formatEth(value)
  } catch {
    return value
  }
}

/** Plain-text description of one change ("Emerald Ape #042 · 1/50: preço 1.19 → 1.25 ETH"). */
export function describeIssue(issue: QuoteIssue): string {
  switch (issue.type) {
    case 'PRICE_CHANGED':
      return `${issue.label}: preço ${formatEth(issue.previous, { suffix: false })} → ${eth(issue.current)}`
    case 'AVAILABILITY_CHANGED':
      return `${issue.label}: quantidade disponível ${issue.previous} → ${issue.current}`
    case 'SOLD_OUT':
      return `${issue.label}: edição esgotada`
    case 'ITEM_REMOVED':
      return `${issue.label}: item removido do carrinho`
    case 'COUPON_CHANGED':
      return `${issue.label || 'Cupom'}: desconto ${formatEth(issue.previous, { suffix: false })} → ${eth(issue.current)}`
    case 'FEE_CHANGED':
      return `${issue.label} ${formatEth(issue.previous, { suffix: false })} → ${eth(issue.current)}`
  }
}

/** Lines the order would be refused for (sold out or more units than available). */
export function unavailableLines(quote: Quote) {
  return quote.items.filter((line) => line.available === 0 || line.quantity > line.available)
}
