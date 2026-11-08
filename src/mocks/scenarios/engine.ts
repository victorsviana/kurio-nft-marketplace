import { delay, HttpResponse } from 'msw'
import type { ErrorCode } from '@/shared/contracts'
import { apiError } from '../lib/http'

/**
 * Scenario engine of the simulated backend (MOCK-04). A scenario is a named, reproducible set
 * of network conditions. The active scenario is persisted in localStorage, so Playwright can
 * select it before boot (`addInitScript`) and the panel can switch it at runtime. Latency uses
 * a seeded PRNG that restarts whenever a scenario is selected, so runs are repeatable.
 *
 * Business situations (price change, sold-out edition, expired session, duplicate events)
 * are not scenarios but control actions: they mutate the database first and then emit the
 * corresponding Socket.IO event (see control.ts).
 */

export type ScenarioId =
  | 'default'
  | 'empty'
  | 'slow'
  | 'variable-latency'
  | 'out-of-order'
  | 'offline'
  | 'server-error'
  | 'payment-declined'
  | 'order-timeout'
  | 'wallet-rejected'

export interface RouteFailure {
  /** "METHOD /path" relative to the API base; `*` matches one or more path characters. */
  route: string
  status: number
  code: ErrorCode
  message?: string
  /** Remaining hits; undefined = permanent while the scenario is active. */
  times?: number
}

export interface ScenarioConfig {
  id: ScenarioId
  label: string
  description: string
  latency: { minMs: number; maxMs: number }
  offline: boolean
  /** Catalog list responses arrive out of order (older requests are slower). */
  outOfOrder: boolean
  catalogEmpty: boolean
  failures: RouteFailure[]
  paymentOutcome: 'confirmed' | 'declined'
  /** POST /orders creates the order but answers after the client timeout. */
  orderTimeout: boolean
  walletRejects: boolean
}

const BASE: Omit<ScenarioConfig, 'id' | 'label' | 'description'> = {
  latency: { minMs: 120, maxMs: 120 },
  offline: false,
  outOfOrder: false,
  catalogEmpty: false,
  failures: [],
  paymentOutcome: 'confirmed',
  orderTimeout: false,
  walletRejects: false,
}

export const SCENARIOS: Record<ScenarioId, ScenarioConfig> = {
  default: { ...BASE, id: 'default', label: 'Padrão', description: 'Tudo funciona, com 120 ms de latência.' },
  empty: {
    ...BASE,
    id: 'empty',
    label: 'Catálogo vazio',
    description: 'A busca do catálogo não retorna resultados.',
    catalogEmpty: true,
  },
  slow: {
    ...BASE,
    id: 'slow',
    label: 'Rede lenta',
    description: 'Toda resposta demora 2,5 s (mostra os skeletons).',
    latency: { minMs: 2500, maxMs: 2500 },
  },
  'variable-latency': {
    ...BASE,
    id: 'variable-latency',
    label: 'Latência variável',
    description: 'Respostas entre 200 ms e 2,5 s (sequência reproduzível).',
    latency: { minMs: 200, maxMs: 2500 },
  },
  'out-of-order': {
    ...BASE,
    id: 'out-of-order',
    label: 'Respostas fora de ordem',
    description: 'No catálogo, requisições ímpares demoram 1,6 s e pares 250 ms.',
    outOfOrder: true,
  },
  offline: {
    ...BASE,
    id: 'offline',
    label: 'Sem conexão',
    description: 'Toda chamada falha na rede e o Socket.IO não reconecta.',
    offline: true,
  },
  'server-error': {
    ...BASE,
    id: 'server-error',
    label: 'Erro 503',
    description: 'Catálogo e detalhe respondem 503 SERVICE_UNAVAILABLE.',
    failures: [
      { route: 'GET /nfts', status: 503, code: 'SERVICE_UNAVAILABLE' },
      { route: 'GET /nfts/*', status: 503, code: 'SERVICE_UNAVAILABLE' },
    ],
  },
  'payment-declined': {
    ...BASE,
    id: 'payment-declined',
    label: 'Pagamento recusado',
    description: 'Novos pedidos terminam recusados.',
    paymentOutcome: 'declined',
  },
  'order-timeout': {
    ...BASE,
    id: 'order-timeout',
    label: 'Timeout no pedido',
    description: 'O pedido é criado, mas a resposta chega depois do timeout do cliente.',
    orderTimeout: true,
  },
  'wallet-rejected': {
    ...BASE,
    id: 'wallet-rejected',
    label: 'Carteira recusa conexão',
    description: 'A conexão da carteira é recusada (422 WALLET_REJECTED).',
    walletRejects: true,
  },
}

export const SCENARIO_STORAGE_KEY = 'kurio.mock.scenario'

let active: ScenarioConfig = SCENARIOS.default
let oneShotFailures: RouteFailure[] = []
let random = seeded(1)
let catalogRequestSeq = 0
const listeners = new Set<(scenario: ScenarioConfig) => void>()

function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function loadScenario() {
  try {
    const raw = localStorage.getItem(SCENARIO_STORAGE_KEY)
    const id = raw ? (JSON.parse(raw) as { id?: string }).id : undefined
    if (id && id in SCENARIOS) active = SCENARIOS[id as ScenarioId]
  } catch {
    active = SCENARIOS.default
  }
}

export function getScenario(): ScenarioConfig {
  return active
}

export function setScenario(id: ScenarioId) {
  if (!(id in SCENARIOS)) throw new Error(`Unknown scenario: ${id}`)
  active = SCENARIOS[id]
  random = seeded(1)
  catalogRequestSeq = 0
  try {
    localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify({ id }))
  } catch {
    /* storage unavailable: scenario stays in memory */
  }
  for (const listener of listeners) listener(active)
}

export function onScenarioChange(listener: (scenario: ScenarioConfig) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function failNext(route: string, options: Omit<RouteFailure, 'route'> & { times?: number }) {
  oneShotFailures.push({ route, ...options, times: options.times ?? 1 })
}

export function clearFailures() {
  oneShotFailures = []
}

function routeMatches(pattern: string, method: string, path: string) {
  const [patternMethod, patternPath = ''] = pattern.split(' ')
  if (patternMethod !== '*' && patternMethod?.toUpperCase() !== method) return false
  const regex = new RegExp(`^${patternPath.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^?]+')}$`)
  return regex.test(path)
}

function nextLatency(): number {
  const { minMs, maxMs } = active.latency
  return Math.round(minMs + (maxMs - minMs) * random())
}

/**
 * Runs before every API handler. Returns a Response to short-circuit (offline, injected
 * failure) or undefined to let the real handler answer after the simulated latency.
 */
export async function applyScenario(request: Request, apiPath: string): Promise<Response | undefined> {
  const method = request.method.toUpperCase()
  const isCatalogList = method === 'GET' && apiPath === '/nfts'

  let latency = nextLatency()
  if (active.outOfOrder && isCatalogList) {
    catalogRequestSeq += 1
    latency = catalogRequestSeq % 2 === 1 ? 1600 : 250
  }
  if (latency > 0) await delay(latency)

  if (active.offline) return HttpResponse.error()

  const oneShot = oneShotFailures.find((f) => routeMatches(f.route, method, apiPath))
  if (oneShot) {
    oneShot.times = (oneShot.times ?? 1) - 1
    if (oneShot.times <= 0) oneShotFailures = oneShotFailures.filter((f) => f !== oneShot)
    return apiError(oneShot.status, oneShot.code, oneShot.message ?? 'Falha simulada.')
  }

  const permanent = active.failures.find((f) => routeMatches(f.route, method, apiPath))
  if (permanent) return apiError(permanent.status, permanent.code, permanent.message ?? 'Serviço temporariamente indisponível.')

  return undefined
}
