import { ws } from 'msw'
import { config } from '@/shared/config'
import { attachConnection } from '../realtime/hub'

/**
 * Intercepts the Socket.IO WebSocket transport. socket.io-client connects to
 * `${socketUrl}/socket.io/?EIO=4&transport=websocket`, but MSW's WebSocketHandler strips
 * the `/socket.io/` prefix from the client URL before matching, so the link must be
 * registered with the bare origin (a `/socket.io/*` pattern never matches).
 */
export const realtimeLink = ws.link(config.socketUrl)

export const realtimeHandlers = [
  realtimeLink.addEventListener('connection', (connection) => {
    const io = attachConnection(connection)
    // Lets the client confirm the simulated server is live (used by /status and smoke tests).
    queueMicrotask(() =>
      io?.client.emit('system.ready', { serverTime: new Date().toISOString() }),
    )
  }),
]
