import Big from 'big.js'
import type { Network } from '@/shared/contracts'
import { expireAllSessions } from './domain/auth'
import { resetOrderTimers, setHold, settleOrder } from './domain/orders'
import { db, mutate, resetDb } from './db/store'
import type { NftRecord } from './db/types'
import { emitStaleNftEvent, publishNftUpdated, replayLastEvent } from './realtime/events'
import { connectionCount, dropAllConnections, restoreConnections } from './realtime/hub'
import {
  clearFailures,
  failNext,
  getScenario,
  SCENARIOS,
  setScenario,
  type RouteFailure,
  type ScenarioId,
} from './scenarios/engine'

/**
 * Control surface of the simulated backend, exposed as `window.__kurioMocks`. It is used by
 * Playwright and by the scenario panel; the application never calls it. Every business action
 * mutates the database first and then publishes the matching event through the Socket.IO hub,
 * so the UI only learns about it through socket.io-client (constitution §2.2).
 */

function updateNft(nftId: string, change: (nft: NftRecord) => void): NftRecord {
  const updated = mutate((draft) => {
    const nft = draft.nfts.find((n) => n.id === nftId)
    if (!nft) throw new Error(`[mocks] unknown NFT ${nftId}`)
    change(nft)
    nft.version += 1
    return nft
  })
  publishNftUpdated(updated)
  return updated
}

function editionOf(nft: NftRecord, editionId?: string) {
  const edition = nft.editions.find((e) => e.id === (editionId ?? nft.defaultEditionId))
  if (!edition) throw new Error(`[mocks] unknown edition ${editionId ?? nft.defaultEditionId}`)
  return edition
}

export const mockControl = {
  scenarios: () => Object.values(SCENARIOS).map(({ id, label, description }) => ({ id, label, description })),
  getScenario: () => getScenario().id,
  setScenario: (id: ScenarioId) => setScenario(id),

  /** Next matching request(s) fail, e.g. failNext('PUT /favorites/*', { status: 500, code: 'INTERNAL_ERROR' }). */
  failNext: (route: string, options: Omit<RouteFailure, 'route'>) => failNext(route, options),
  clearFailures,

  /** Restores the deterministic seed and the default scenario (MOCK-03). */
  reset: async () => {
    clearFailures()
    setScenario('default')
    restoreConnections()
    resetOrderTimers()
    setHold(false)
    await resetDb()
  },

  /** Every active session becomes expired; the next private request gets 401 SESSION_EXPIRED. */
  expireSessions: () => expireAllSessions(),

  nft: {
    get: (nftId: string) => db().nfts.find((n) => n.id === nftId) ?? null,
    /** Changes an edition price (default edition when omitted) and emits nft.updated. */
    setPrice: (nftId: string, price: string, editionId?: string) =>
      updateNft(nftId, (nft) => {
        editionOf(nft, editionId).price = new Big(price).toString()
      }),
    setAvailability: (nftId: string, editionId: string, available: number) =>
      updateNft(nftId, (nft) => {
        editionOf(nft, editionId).available = Math.max(0, Math.floor(available))
      }),
    sellOut: (nftId: string, editionId?: string) =>
      updateNft(nftId, (nft) => {
        editionOf(nft, editionId).available = 0
      }),
  },

  orders: {
    list: () => db().orders.map(({ id, status, userId, total, version }) => ({ id, status, userId, total, version })),
    /** true: new and pending orders stay pending until `settle` (survives reload). */
    hold: (value = true) => setHold(value),
    /** Settles a pending order now (the latest pending one when omitted), optionally forcing the outcome. */
    settle: (orderId?: string, outcome?: 'confirmed' | 'declined') => {
      const id = orderId ?? db().orders.findLast((o) => o.status === 'pending')?.id
      return id ? settleOrder(id, outcome) : null
    },
  },

  wallets: {
    /** Drops every wallet connection: the next POST /orders answers 422 WALLET_DISCONNECTED. */
    disconnectAll: () =>
      mutate((draft) => {
        draft.walletConnections = []
      }),
    connections: () => db().walletConnections,
  },

  coupons: {
    /** Expires a coupon (even one already applied to a cart): quotes then report it as expired. */
    expire: (code: string) =>
      mutate((draft) => {
        const coupon = draft.coupons.find((c) => c.code === code.toUpperCase())
        if (coupon) coupon.expiresAt = new Date(Date.now() - 1000).toISOString()
      }),
  },

  /** Changes the network fee (FEE_CHANGED in the next quote comparison). */
  setNetworkFee: (network: Network, fee: string) =>
    mutate((draft) => {
      draft.networkFees[network] = new Big(fee).toString()
    }),

  realtime: {
    connectionCount,
    dropAllConnections,
    restoreConnections,
    replayLastEvent,
    emitStaleNftEvent: (nftId: string, bogusPrice?: string) => {
      const nft = db().nfts.find((n) => n.id === nftId)
      if (!nft) throw new Error(`[mocks] unknown NFT ${nftId}`)
      return emitStaleNftEvent(nft, bogusPrice)
    },
  },
}

export type MockControl = typeof mockControl
