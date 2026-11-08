import { http } from 'msw'
import { api, apiError, apiPathOf } from '../lib/http'
import { applyScenario } from '../scenarios/engine'

/** First handler in the chain: applies latency, offline mode and injected failures. */
export const scenarioHandler = http.all(api('/*'), async ({ request }) => applyScenario(request, apiPathOf(request)))

/** Last handler: unknown API routes answer 404 instead of leaking to the static host. */
export const notFoundHandler = http.all(api('/*'), () => apiError(404, 'NOT_FOUND', 'Rota não encontrada na API simulada.'))
