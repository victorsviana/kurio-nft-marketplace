import { io, type Socket } from 'socket.io-client'
import { config } from '@/shared/config'

/**
 * Creates the Socket.IO client. The WebSocket transport is forced because the mock
 * layer (MSW) intercepts WebSockets, not HTTP long-polling (documented in ARCHITECTURE.md).
 */
export function createSocket(token: string | null): Socket {
  return io(config.socketUrl, {
    transports: ['websocket'],
    auth: token ? { token } : {},
    autoConnect: false,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
  })
}
