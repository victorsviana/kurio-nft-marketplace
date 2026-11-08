import { toSocketIo } from '@mswjs/socket.io-binding'
import type { WebSocketHandlerConnection } from 'msw'

/**
 * Simulated Socket.IO server.
 *
 * Every socket opened by `socket.io-client` is intercepted by MSW (`ws.link`) and
 * registered here. Domain code in `src/mocks` publishes events through this hub;
 * the hub encodes them with `@mswjs/socket.io-binding`, so the app receives real
 * Socket.IO frames on its real client.
 *
 * Binding limitations handled here (documented in ARCHITECTURE.md):
 * - the binding acknowledges the namespace but ignores the handshake `auth`, so the
 *   CONNECT packet (`40{...}`) is parsed manually to learn which session owns the socket;
 * - the binding never pings, and socket.io-client drops a connection after
 *   `pingInterval + pingTimeout` (30s) without one, so the hub sends Engine.IO pings;
 * - only the default namespace `/` is supported.
 */

type SocketIoDuplex = ReturnType<typeof toSocketIo>

interface Peer {
  id: string
  io: SocketIoDuplex
  token: string | null
  close: (code?: number, reason?: string) => void
}

/** Resolves a session token to a user id; set by the mock auth module. */
type TokenResolver = (token: string | null) => string | null

const PING_INTERVAL_MS = 20_000
const peers = new Map<string, Peer>()
let resolveUser: TokenResolver = () => null
let acceptingConnections = true

export function setTokenResolver(resolver: TokenResolver) {
  resolveUser = resolver
}

function parseConnectPacket(raw: string): string | null {
  // Socket.IO CONNECT to the default namespace: "40" followed by the optional auth JSON.
  if (!raw.startsWith('40')) return null
  const body = raw.slice(2)
  if (!body) return null
  try {
    const auth = JSON.parse(body) as { token?: unknown }
    return typeof auth.token === 'string' ? auth.token : null
  } catch {
    return null
  }
}

export function attachConnection(connection: WebSocketHandlerConnection): SocketIoDuplex | null {
  if (!acceptingConnections) {
    // Simulated outage: refuse the socket so the client keeps retrying.
    queueMicrotask(() => connection.client.close(1013, 'Simulated outage'))
    return null
  }

  const io = toSocketIo(connection)
  const peer: Peer = {
    id: crypto.randomUUID(),
    io,
    token: null,
    close: (code, reason) => connection.client.close(code, reason),
  }
  peers.set(peer.id, peer)

  connection.client.addEventListener('message', (event) => {
    if (typeof event.data !== 'string') return
    const token = parseConnectPacket(event.data)
    if (token !== null || event.data.startsWith('40')) peer.token = token
  })

  const ping = setInterval(() => connection.client.send('2'), PING_INTERVAL_MS)

  connection.client.addEventListener('close', () => {
    clearInterval(ping)
    peers.delete(peer.id)
  })

  return io
}

/** Sends an event to every connected socket (public resources such as NFTs). */
export function broadcast(eventName: string, payload: unknown) {
  for (const peer of peers.values()) peer.io.client.emit(eventName, payload)
}

/**
 * Sends an event only to sockets whose handshake token currently resolves to `userId`.
 * The token is re-resolved at send time, so an expired or logged-out session stops
 * receiving private events immediately (RT-07).
 */
export function sendToUser(userId: string, eventName: string, payload: unknown) {
  for (const peer of peers.values()) {
    if (resolveUser(peer.token) === userId) peer.io.client.emit(eventName, payload)
  }
}

/** Drops every socket; with `refuse` the hub also rejects reconnections until restored. */
export function dropAllConnections(options: { refuse?: boolean } = {}) {
  if (options.refuse) acceptingConnections = false
  for (const peer of [...peers.values()]) peer.close(1012, 'Simulated disconnect')
}

export function restoreConnections() {
  acceptingConnections = true
}

export function connectionCount() {
  return peers.size
}
