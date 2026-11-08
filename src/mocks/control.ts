import Big from 'big.js'
import { expireAllSessions } from './domain/auth'
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
