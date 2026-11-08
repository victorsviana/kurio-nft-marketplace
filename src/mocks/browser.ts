import { setupWorker } from 'msw/browser'
import { mockControl } from './control'
import { resolveTokenUser } from './domain/auth'
import { initDb } from './db/store'
import { authHandlers } from './handlers/auth'
import { cartHandlers } from './handlers/cart'
import { nftHandlers } from './handlers/nfts'
import { realtimeHandlers } from './handlers/realtime'
import { notFoundHandler, scenarioHandler } from './handlers/scenario'
import { systemHandlers } from './handlers/system'
import { dropAllConnections, restoreConnections, setTokenResolver } from './realtime/hub'
import { getScenario, loadScenario, onScenarioChange } from './scenarios/engine'

export const worker = setupWorker(
  scenarioHandler,
  ...systemHandlers,
  ...authHandlers,
  ...nftHandlers,
  ...cartHandlers,
  notFoundHandler,
  ...realtimeHandlers,
)

declare global {
  interface Window {
    __kurioMocks?: typeof mockControl
  }
}

function syncSocketAvailability() {
  if (getScenario().offline) dropAllConnections({ refuse: true })
  else restoreConnections()
}

export async function startMockServer() {
  loadScenario()
  await initDb()
  // Private Socket.IO events are routed by the user that owns the handshake token (RT-07).
  setTokenResolver(resolveTokenUser)
  syncSocketAvailability()
  onScenarioChange(syncSocketAvailability)

  await worker.start({
    onUnhandledRequest: 'bypass',
    // quiet in every mode: MSW would otherwise log request bodies, including passwords
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
  window.__kurioMocks = mockControl

  // The scenario panel is part of the mock layer and lives in its own React root.
  void import('./panel/mount').then(({ mountScenarioPanel }) => mountScenarioPanel())
}
