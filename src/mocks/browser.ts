import { setupWorker } from 'msw/browser'
import { realtimeHandlers } from './handlers/realtime'
import { systemHandlers } from './handlers/system'
import { broadcast, connectionCount, dropAllConnections, restoreConnections } from './realtime/hub'

export const worker = setupWorker(...systemHandlers, ...realtimeHandlers)

/**
 * Control surface of the simulated backend. It lives in the mock layer and only
 * mutates mock state; the app never calls it. Playwright and the scenario panel use it.
 */
const mockControl = {
  broadcast,
  connectionCount,
  dropAllConnections,
  restoreConnections,
}

declare global {
  interface Window {
    __kurioMocks?: typeof mockControl
  }
}

export async function startMockServer() {
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: import.meta.env.PROD,
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
  window.__kurioMocks = mockControl
}
