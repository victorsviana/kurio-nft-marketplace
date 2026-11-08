import type { NftUpdatedEvent, OrderUpdatedEvent, RealtimeEvent } from '@/shared/contracts'
import { defaultEdition, totalAvailable } from '../domain/catalog'
import type { NftRecord, OrderRecord } from '../db/types'
import { broadcast, sendToUser } from './hub'

/**
 * Domain events of the simulated backend. They are always published AFTER the database
 * mutation, from the same data, so REST and Socket.IO stay coherent (MOCK-06). The app only
 * ever receives them through socket.io-client (RT-01).
 */

interface Sent {
  event: RealtimeEvent
  /** null = broadcast */
  userId: string | null
}

let lastSent: Sent | null = null

function send(event: RealtimeEvent, userId: string | null) {
  lastSent = { event, userId }
  if (userId) sendToUser(userId, event.type, event)
  else broadcast(event.type, event)
}

export function nftUpdatedEvent(nft: NftRecord, version = nft.version): NftUpdatedEvent {
  return {
    eventId: crypto.randomUUID(),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version,
    occurredAt: new Date().toISOString(),
    data: {
      nftId: nft.id,
      price: defaultEdition(nft).price,
      compareAtPrice: nft.compareAtPrice,
      available: totalAvailable(nft),
      editions: nft.editions,
    },
  }
}

export function publishNftUpdated(nft: NftRecord) {
  send(nftUpdatedEvent(nft), null)
}

export function publishOrderUpdated(order: OrderRecord) {
  const event: OrderUpdatedEvent = {
    eventId: crypto.randomUUID(),
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: new Date().toISOString(),
    data: { orderId: order.id, status: order.status, txHash: order.txHash, declineReason: order.declineReason },
  }
  send(event, order.userId)
}

/** Control action: re-sends the last event with the same eventId (RT-05 duplicate test). */
export function replayLastEvent(): RealtimeEvent | null {
  if (!lastSent) return null
  if (lastSent.userId) sendToUser(lastSent.userId, lastSent.event.type, lastSent.event)
  else broadcast(lastSent.event.type, lastSent.event)
  return lastSent.event
}

/**
 * Control action: sends an `nft.updated` with an older version and a bogus price. A correct
 * client ignores it (RT-05). The database is not touched, on purpose: this simulates a late
 * delivery of an event that the server already superseded.
 */
export function emitStaleNftEvent(nft: NftRecord, bogusPrice = '0.01') {
  const event = nftUpdatedEvent(nft, Math.max(0, nft.version - 1))
  event.data = { ...event.data, price: bogusPrice }
  broadcast(event.type, event)
  return event
}
