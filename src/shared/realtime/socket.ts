import type { Socket } from 'socket.io-client'
import { config } from '@/shared/config'

/**
 * Creates the Socket.IO client. The WebSocket transport is forced because the mock layer
 * (MSW) intercepts WebSockets, not HTTP long-polling (documented in ARCHITECTURE.md).
 *
 * socket.io-client is imported lazily ON PURPOSE: engine.io-client captures
 * `globalThis.WebSocket` when its module is evaluated. If it were part of the initial bundle,
 * it would grab the native WebSocket before MSW patches it in `startMockServer()`, and the
 * simulated server would never see the connection. Loading it after boot also keeps it out
 * of the critical path.
 */
export async function createSocket(token: string | null): Promise<Socket> {
  const { io } = await import('socket.io-client')
  return io(config.socketUrl, {
    transports: ['websocket'],
    auth: token ? { token } : {},
    autoConnect: false,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
  })
}
