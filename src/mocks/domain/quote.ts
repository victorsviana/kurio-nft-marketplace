import Big from 'big.js'
import type { Network, Quote, QuoteIssue, QuoteLine } from '@/shared/contracts'
import { artImage } from '../db/fixtures'
import { db, mutate } from '../db/store'
import type { CartRecord, DbState, QuoteRecord } from '../db/types'
import { nowIso } from '../lib/http'
import { checkCoupon } from './cart'

/**
 * Quote engine of the simulated backend: the only place that prices a purchase (constitution
 * §2.4). The client shows these strings as they are; it never recomputes totals (CART-06).
 */

const MAX_QUOTES_PER_CART = 10
const money = (value: Big) => value.round(6, Big.roundDown).toString()

function priceLines(state: Readonly<DbState>, cart: CartRecord): QuoteLine[] {
  return cart.items.flatMap((item) => {
    const nft = state.nfts.find((n) => n.id === item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    if (!nft || !edition) return []
    return [
      {
        itemId: item.id,
        nftId: nft.id,
        editionId: edition.id,
        name: nft.name,
        image: artImage(nft.art),
        tokenId: nft.tokenId,
        editionLabel: edition.label,
        unitPrice: edition.price,
        quantity: item.quantity,
        available: edition.available,
        lineTotal: money(new Big(edition.price).times(item.quantity)),
      },
    ]
  })
}

const lineLabel = (line: QuoteLine) => `${line.name} · ${line.editionLabel}`

/** Stock problems of the current cart, independent of any previous quote. */
function stockIssues(lines: QuoteLine[]): QuoteIssue[] {
  return lines.flatMap<QuoteIssue>((line) => {
    if (line.available === 0) {
      return [{ type: 'SOLD_OUT', itemId: line.itemId, label: lineLabel(line), previous: String(line.quantity), current: '0' }]
    }
    if (line.quantity > line.available) {
      return [
        {
          type: 'AVAILABILITY_CHANGED',
          itemId: line.itemId,
          label: lineLabel(line),
          previous: String(line.quantity),
          current: String(line.available),
        },
      ]
    }
    return []
  })
}

/** What changed between the quote the user reviewed and the new one (CHK-05). */
export function diffQuotes(previous: QuoteRecord, next: Omit<QuoteRecord, 'issues'>): QuoteIssue[] {
  const issues: QuoteIssue[] = []
  for (const before of previous.items) {
    const after = next.items.find((l) => l.itemId === before.itemId)
    if (!after) {
      issues.push({ type: 'ITEM_REMOVED', itemId: before.itemId, label: lineLabel(before), previous: String(before.quantity), current: '0' })
      continue
    }
    if (!new Big(before.unitPrice).eq(after.unitPrice)) {
      issues.push({ type: 'PRICE_CHANGED', itemId: after.itemId, label: lineLabel(after), previous: before.unitPrice, current: after.unitPrice })
    }
    if (before.quantity !== after.quantity) {
      issues.push({
        type: 'AVAILABILITY_CHANGED',
        itemId: after.itemId,
        label: lineLabel(after),
        previous: String(before.quantity),
        current: String(after.quantity),
      })
    }
  }
  const couponBefore = previous.coupon ? `${previous.coupon.code}:${previous.coupon.status}:${previous.discount}` : 'none'
  const couponAfter = next.coupon ? `${next.coupon.code}:${next.coupon.status}:${next.discount}` : 'none'
  if (couponBefore !== couponAfter) {
    issues.push({
      type: 'COUPON_CHANGED',
      itemId: null,
      label: `Cupom ${next.coupon?.code ?? previous.coupon?.code ?? ''}`.trim(),
      previous: previous.discount,
      current: next.discount,
    })
  }
  if (!new Big(previous.networkFee).eq(next.networkFee)) {
    issues.push({ type: 'FEE_CHANGED', itemId: null, label: 'Taxa de rede', previous: previous.networkFee, current: next.networkFee })
  }
  return issues
}

/** Prices the cart without persisting anything. */
export function priceCart(cart: CartRecord, network: Network, userId: string | null): Omit<QuoteRecord, 'issues'> {
  const state = db()
  const items = priceLines(state, cart)
  const subtotal = items.reduce((sum, line) => sum.plus(line.lineTotal), new Big(0))
  let discount = new Big(0)
  let coupon: QuoteRecord['coupon'] = null
  if (cart.couponCode) {
    const check = checkCoupon(state, cart.couponCode)
    coupon = { code: cart.couponCode, status: check.status }
    if (check.status === 'applied') discount = subtotal.times(check.percentOff).div(100)
  }
  const networkFee = items.length === 0 ? new Big(0) : new Big(state.networkFees[network])
  const total = subtotal.minus(discount).plus(networkFee)
  return {
    id: `quote-${crypto.randomUUID()}`,
    cartId: cart.id,
    userId,
    cartVersion: cart.version,
    network,
    items,
    subtotal: money(subtotal),
    discount: money(discount),
    networkFee: money(networkFee),
    total: money(total),
    coupon,
    purchasable: items.length > 0 && stockIssues(items).length === 0,
    createdAt: nowIso(),
  }
}

/**
 * Prices and stores a quote. With `previous`, the issues describe what changed since that
 * quote; otherwise only stock problems are listed.
 */
export function createQuote(cart: CartRecord, network: Network, userId: string | null, previous?: QuoteRecord): QuoteRecord {
  const priced = priceCart(cart, network, userId)
  const issues = [...(previous ? diffQuotes(previous, priced) : []), ...stockIssues(priced.items)]
  const record: QuoteRecord = { ...priced, issues }
  mutate((draft) => {
    // Quotes are persisted with the rest of the database (localStorage): keep the newest few.
    const others = draft.quotes.filter((q) => q.cartId !== cart.id)
    const mine = draft.quotes.filter((q) => q.cartId === cart.id).slice(-(MAX_QUOTES_PER_CART - 1))
    draft.quotes = [...others, ...mine, record]
  })
  return record
}

export function findQuote(quoteId: string): QuoteRecord | undefined {
  return db().quotes.find((q) => q.id === quoteId)
}

/** True when the purchase would cost or contain something different from the reviewed quote. */
export function quoteChanged(reviewed: QuoteRecord, current: Omit<QuoteRecord, 'issues'>): boolean {
  return diffQuotes(reviewed, current).length > 0 || !current.purchasable || reviewed.items.length !== current.items.length
}

export function toQuoteDto(quote: QuoteRecord): Quote {
  return {
    id: quote.id,
    cartVersion: quote.cartVersion,
    items: quote.items,
    subtotal: quote.subtotal,
    discount: quote.discount,
    networkFee: quote.networkFee,
    total: quote.total,
    coupon: quote.coupon,
    network: quote.network,
    issues: quote.issues,
    purchasable: quote.purchasable,
    createdAt: quote.createdAt,
  }
}
