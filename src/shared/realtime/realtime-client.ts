import type { Socket } from 'socket.io-client'
import { REALTIME_EVENT_TYPES, realtimeEventSchema, type RealtimeEvent, type RealtimeEventType } from '@/shared/contracts'
import { createSocket } from './socket'

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'
type EventOf<T extends RealtimeEventType> = Extract<RealtimeEvent, { type: T }>
type Handler<T extends RealtimeEventType> = (event: EventOf<T>) => void

const MAX_SEEN_EVENTS = 500

/**
 * One Socket.IO connection bound to one session token (RT-01, RT-07). A new session gets a
 * new client: the old socket is closed and its listeners and dedupe state are discarded, so
 * events addressed to a previous session can never be applied to the next user.
 *
 * Every event is validated against the contract (RT-04), deduplicated by `eventId` and
 * applied only when its `version` is newer than the last one seen for that resource (RT-05).
 * After a reconnection, `onReconnect` subscribers reconcile active resources with REST (RT-06).
 */
export class RealtimeClient {
  readonly token: string | null
  private socket: Socket | null = null
  private readonly seen: string[] = []
  private readonly seenSet = new Set<string>()
  private readonly versions = new Map<string, number>()
  private readonly handlers = new Map<RealtimeEventType, Set<(event: RealtimeEvent) => void>>()
  private readonly reconnectHandlers = new Set<() => void>()
  private readonly statusHandlers = new Set<(status: RealtimeStatus) => void>()
  private hasConnected = false
  private closed = false
  status: RealtimeStatus = 'connecting'

  constructor(token: string | null) {
    this.token = token
    void createSocket(token).then((socket) => {
      if (this.closed) return
      this.socket = socket
      for (const type of REALTIME_EVENT_TYPES) socket.on(type, (payload: unknown) => this.dispatch(payload))
      socket.on('connect', () => {
        this.setStatus('connected')
        if (this.hasConnected) for (const handler of this.reconnectHandlers) handler()
        this.hasConnected = true
      })
      socket.on('disconnect', () => this.setStatus('disconnected'))
      socket.on('connect_error', () => this.setStatus('disconnected'))
      socket.connect()
    })
  }

  private setStatus(status: RealtimeStatus) {
    if (this.closed) return
    this.status = status
    for (const handler of this.statusHandlers) handler(status)
  }

  private dispatch(payload: unknown) {
    if (this.closed) return
    const parsed = realtimeEventSchema.safeParse(payload)
    if (!parsed.success) {
      if (import.meta.env.DEV) console.warn('[realtime] event outside the contract ignored', parsed.error.issues)
      return
    }
    const event = parsed.data
    if (this.seenSet.has(event.eventId)) return
    const resourceKey = `${event.resource.type}:${event.resource.id}`
    const lastVersion = this.versions.get(resourceKey)
    if (lastVersion !== undefined && event.version <= lastVersion) return

    this.remember(event.eventId)
    this.versions.set(resourceKey, event.version)
    const handlers = this.handlers.get(event.type)
    if (handlers) for (const handler of handlers) handler(event)
  }

  private remember(eventId: string) {
    this.seen.push(eventId)
    this.seenSet.add(eventId)
    if (this.seen.length > MAX_SEEN_EVENTS) this.seenSet.delete(this.seen.shift()!)
  }

  on<T extends RealtimeEventType>(type: T, handler: Handler<T>): () => void {
    const set = this.handlers.get(type) ?? new Set()
    // dispatch() only calls the handlers registered for event.type, so the cast is sound
    const untyped = handler as unknown as (event: RealtimeEvent) => void
    set.add(untyped)
    this.handlers.set(type, set)
    return () => {
      set.delete(untyped)
    }
  }

  onReconnect(handler: () => void): () => void {
    this.reconnectHandlers.add(handler)
    return () => {
      this.reconnectHandlers.delete(handler)
    }
  }

  onStatus(handler: (status: RealtimeStatus) => void): () => void {
    this.statusHandlers.add(handler)
    return () => {
      this.statusHandlers.delete(handler)
    }
  }

  /** Releases the socket and every listener (RT-08). */
  close() {
    this.closed = true
    this.handlers.clear()
    this.reconnectHandlers.clear()
    this.statusHandlers.clear()
    this.socket?.removeAllListeners()
    this.socket?.disconnect()
    this.socket = null
  }
}
