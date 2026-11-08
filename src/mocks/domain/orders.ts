import type { Order, OrderStatus } from '@/shared/contracts'
import { db, mutate } from '../db/store'
import type { OrderRecord } from '../db/types'
import { nowIso } from '../lib/http'
import { publishNftUpdated, publishOrderUpdated } from '../realtime/events'
import { removePurchasedLines } from './cart'

/**
 * Order lifecycle of the simulated backend (ORD-01..ORD-06).
 *
 * An order is created `pending` with the outcome decided by the active scenario and settles
 * after SETTLE_DELAY_MS. Settling is a database mutation followed by the `order.updated`
 * event (and `nft.updated` for the stock it consumed), so the UI learns about it only through
 * Socket.IO or REST. The simulated server lives in the page, so timers die on refresh: pending
 * orders are re-scheduled on boot and settled lazily when read (recovery after refresh, ORD-02).
 *
 * Tests control timing with `hold` (orders stay pending until `settle` is called), persisted in
 * localStorage so it survives a reload.
 */

export const SETTLE_DELAY_MS = 2_000
const HOLD_STORAGE_KEY = 'kurio.mock.orders'
const timers = new Map<string, number>()

function readHold(): boolean {
  try {
    return (JSON.parse(localStorage.getItem(HOLD_STORAGE_KEY) ?? '{}') as { hold?: boolean }).hold === true
  } catch {
    return false
  }
}

let hold = readHold()

export function setHold(value: boolean) {
  hold = value
  try {
    localStorage.setItem(HOLD_STORAGE_KEY, JSON.stringify({ hold: value }))
  } catch {
    /* in memory only */
  }
  if (!value) for (const order of db().orders) if (order.status === 'pending') schedule(order)
}

export const isHolding = () => hold

function explorerUrl(network: OrderRecord['network'], txHash: string) {
  if (network === 'polygon') return `https://polygonscan.com/tx/${txHash}`
  if (network === 'solana') return `https://solscan.io/tx/${txHash}`
  return `https://etherscan.io/tx/${txHash}`
}

function randomTxHash() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

export function toOrderDto(order: OrderRecord): Order {
  const { userId: _userId, quoteId: _quoteId, plannedOutcome: _planned, settleAt: _settleAt, ...dto } = order
  return dto
}

function schedule(order: OrderRecord) {
  if (hold || order.status !== 'pending' || timers.has(order.id)) return
  const wait = Math.max(0, Date.parse(order.settleAt) - Date.now())
  timers.set(
    order.id,
    window.setTimeout(() => {
      timers.delete(order.id)
      if (!hold) settleOrder(order.id)
    }, wait),
  )
}

/**
 * Applies the final state. Confirmation consumes stock (and emits `nft.updated` for each NFT,
 * MOCK-06) and removes only the purchased quantities from the cart (ORD-04). If the stock is no
 * longer there, the order is declined instead. Terminal orders are never touched again.
 */
export function settleOrder(orderId: string, forced?: Exclude<OrderStatus, 'pending'>): OrderRecord | null {
  const current = db().orders.find((o) => o.id === orderId)
  if (!current || current.status !== 'pending') return current ?? null
  window.clearTimeout(timers.get(orderId))
  timers.delete(orderId)

  const touchedNfts = new Set<string>()
  const settled = mutate((draft) => {
    const order = draft.orders.find((o) => o.id === orderId)!
    let outcome = forced ?? order.plannedOutcome
    let declineReason: string | null = outcome === 'declined' ? 'Pagamento recusado pela carteira na simulação.' : null

    if (outcome === 'confirmed') {
      const shortage = order.items.find((line) => {
        const edition = draft.nfts.find((n) => n.id === line.nftId)?.editions.find((e) => e.id === line.editionId)
        return !edition || edition.available < line.quantity
      })
      if (shortage) {
        outcome = 'declined'
        declineReason = `A edição ${shortage.editionLabel} de ${shortage.name} esgotou antes da confirmação.`
      }
    }

    if (outcome === 'confirmed') {
      for (const line of order.items) {
        const nft = draft.nfts.find((n) => n.id === line.nftId)!
        nft.editions.find((e) => e.id === line.editionId)!.available -= line.quantity
        if (!touchedNfts.has(nft.id)) nft.version += 1
        touchedNfts.add(nft.id)
      }
      removePurchasedLines(draft, order.userId, order.items)
      order.txHash = randomTxHash()
      order.explorerUrl = explorerUrl(order.network, order.txHash)
      order.confirmedAt = nowIso()
    }
    order.status = outcome
    order.declineReason = declineReason
    order.version += 1
    return order
  })

  for (const nftId of touchedNfts) {
    const nft = db().nfts.find((n) => n.id === nftId)
    if (nft) publishNftUpdated(nft)
  }
  publishOrderUpdated(settled)
  return settled
}

/** Lazy settlement for reads after a refresh (the timer of the previous page is gone). */
export function settleIfDue(order: OrderRecord): OrderRecord {
  if (order.status === 'pending' && !hold && Date.parse(order.settleAt) <= Date.now()) {
    return settleOrder(order.id) ?? order
  }
  if (order.status === 'pending') schedule(order)
  return order
}

/** Boot: re-arms the timers of orders that were pending when the page was closed. */
export function resumePendingOrders() {
  for (const order of db().orders) if (order.status === 'pending') schedule(order)
}

export function newOrderTimes() {
  const createdAt = nowIso()
  return { createdAt, settleAt: new Date(Date.now() + SETTLE_DELAY_MS).toISOString() }
}

export function resetOrderTimers() {
  for (const timer of timers.values()) window.clearTimeout(timer)
  timers.clear()
}

/** Stable fingerprint of a request body: same key + different body = 409 (ORD-06). */
export function fingerprint(value: unknown): string {
  const normalize = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(normalize)
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.keys(v as Record<string, unknown>)
          .sort()
          .map((k) => [k, normalize((v as Record<string, unknown>)[k])]),
      )
    }
    return v
  }
  return JSON.stringify(normalize(value))
}
