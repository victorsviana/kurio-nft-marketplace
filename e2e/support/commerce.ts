import type { Page } from '@playwright/test'

/**
 * REST helpers that talk to the simulated backend from inside the page (`fetch` → MSW), with the
 * session token and visitor cart id the app stored. They set up state for UI tests and prove the
 * server rules (idempotency, revalidation, isolation) at the API level.
 */

export interface ApiResult<T = unknown> {
  status: number
  body: T
  ms: number
}

// oxlint-disable-next-line typescript/no-explicit-any -- test helper: bodies are asserted field by field
export async function api<T = any>(
  page: Page,
  method: string,
  path: string,
  options: { body?: unknown; headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<ApiResult<T>> {
  return page.evaluate(
    async ({ method, path, body, headers, timeoutMs }) => {
      const session = JSON.parse(localStorage.getItem('kurio.session') ?? 'null') as { token?: string } | null
      let guest = localStorage.getItem('kurio.guestCartId')
      if (!guest) {
        guest = crypto.randomUUID()
        localStorage.setItem('kurio.guestCartId', guest)
      }
      const started = performance.now()
      const controller = new AbortController()
      const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined
      try {
        const response = await fetch(`/api${path}`, {
          method,
          signal: controller.signal,
          headers: {
            'content-type': 'application/json',
            'X-Guest-Cart-Id': guest,
            ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
            ...headers,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        })
        const text = await response.text()
        return { status: response.status, body: text ? JSON.parse(text) : null, ms: performance.now() - started }
      } catch {
        return { status: 0, body: null, ms: performance.now() - started }
      } finally {
        clearTimeout(timer)
      }
    },
    { method, path, body: options.body, headers: options.headers ?? {}, timeoutMs: options.timeoutMs },
  )
}

export const ANA_WALLET = { id: 'wallet-ana-primary', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', network: 'ethereum', kind: 'metamask' }

export const ANA_BUYER = {
  displayName: 'Ana Ribeiro',
  username: 'ana.ribeiro',
  profileName: 'anaribeiro',
  ensSuffix: '.eth',
  email: 'ana@kurio.dev',
  walletAddress: ANA_WALLET.address,
  walletKind: 'metamask',
  secondaryReference: '',
  referralCode: '',
  note: '',
}

/** Adds an edition (kind like 'limited-50', or 'default') to the current cart through the API. */
export async function addToCart(page: Page, nftId: string, edition: string, quantity: number) {
  const editionId =
    edition === 'default'
      ? await page.evaluate((id) => (window.__kurioMocks!.nft.get(id) as { defaultEditionId: string }).defaultEditionId, nftId)
      : `${nftId}.${edition}`
  return api(page, 'POST', '/cart/items', { body: { nftId, editionId, quantity } })
}

/** Cart + wallet connection + quote: everything POST /orders needs (signed in as Ana). */
export async function readyToOrder(page: Page) {
  await addToCart(page, 'emerald-ape-042', 'limited-50', 2)
  await addToCart(page, 'violet-nomad-314', 'default', 1)
  await api(page, 'POST', `/wallets/${ANA_WALLET.id}/connect`, { body: { network: 'ethereum', kind: 'metamask' } })
  const quote = await api(page, 'POST', '/quote', { body: { network: 'ethereum' } })
  return { quote: quote.body, input: { quoteId: quote.body.id, walletId: ANA_WALLET.id, network: 'ethereum', buyer: ANA_BUYER } }
}
