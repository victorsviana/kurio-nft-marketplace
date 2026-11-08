import type { Page } from '@playwright/test'

/**
 * E2E helpers for the simulated backend. Each test runs in a fresh browser context, so the
 * mock database starts from the deterministic seed (QA-01). Everything here goes through the
 * mock layer (localStorage before boot, or `window.__kurioMocks` / the REST API after boot);
 * nothing touches the app's cache or component state.
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

export const USERS = {
  ana: { email: 'ana@kurio.dev', password: 'kurio2026', displayName: 'Ana Ribeiro', id: 'user-ana' },
  bruno: { email: 'bruno@kurio.dev', password: 'kurio2026', displayName: 'Bruno Costa', id: 'user-bruno' },
} as const

/** Selects a scenario before the app boots and hides the scenario panel (call before goto). */
export async function prepare(page: Page, options: { scenario?: ScenarioId; showPanel?: boolean } = {}) {
  await page.addInitScript(
    ({ scenario, showPanel }) => {
      if (scenario) localStorage.setItem('kurio.mock.scenario', JSON.stringify({ id: scenario }))
      if (!showPanel) localStorage.setItem('kurio.mock.panel', 'hidden')
    },
    { scenario: options.scenario, showPanel: options.showPanel ?? false },
  )
}

/** Waits until MSW and the control API are ready. */
export async function waitForMocks(page: Page) {
  await page.waitForFunction(() => Boolean(window.__kurioMocks))
}

/** Switches the scenario at runtime (after boot). */
export async function setScenario(page: Page, scenario: ScenarioId) {
  await waitForMocks(page)
  await page.evaluate((id) => window.__kurioMocks!.setScenario(id), scenario)
}

/**
 * Signs in through the REST API of the simulated backend and stores the session the same
 * way the app does, then reloads. Use it when the test is not about the login UI itself.
 */
export async function signInViaApi(page: Page, user: keyof typeof USERS) {
  await waitForMocks(page)
  await page.evaluate(async ({ email, password }) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = (await response.json()) as { user: { id: string }; session: { token: string; expiresAt: string } }
    localStorage.setItem(
      'kurio.session',
      JSON.stringify({ token: body.session.token, expiresAt: body.session.expiresAt, userId: body.user.id }),
    )
  }, USERS[user])
  await page.reload()
  await waitForMocks(page)
}

declare global {
  interface Window {
    __kurioMocks?: {
      setScenario: (id: ScenarioId) => void
      getScenario: () => ScenarioId
      failNext: (route: string, options: { status: number; code: string; message?: string; times?: number }) => void
      clearFailures: () => void
      reset: () => Promise<void>
      expireSessions: () => void
      nft: {
        get: (nftId: string) => unknown
        setPrice: (nftId: string, price: string, editionId?: string) => unknown
        setAvailability: (nftId: string, editionId: string, available: number) => unknown
        sellOut: (nftId: string, editionId?: string) => unknown
      }
      orders: {
        list: () => { id: string; status: string; userId: string; total: string; version: number }[]
        hold: (value?: boolean) => void
        settle: (orderId?: string, outcome?: 'confirmed' | 'declined') => unknown
      }
      wallets: {
        disconnectAll: () => void
        connections: () => unknown[]
      }
      coupons: { expire: (code: string) => void }
      setNetworkFee: (network: 'ethereum' | 'polygon' | 'solana', fee: string) => void
      realtime: {
        connectionCount: () => number
        dropAllConnections: (options?: { refuse?: boolean }) => void
        restoreConnections: () => void
        replayLastEvent: () => unknown
        emitStaleNftEvent: (nftId: string, bogusPrice?: string) => unknown
      }
    }
  }
}
