import { expect, test, type Page } from '@playwright/test'
import { addToCart } from './support/commerce.ts'
import { prepare, signInViaApi, waitForMocks, type ScenarioId } from './support/mocks.ts'

/**
 * Cross-screen purchase flows (§9 items 6, 7 and 10): catalog → detail → cart → payment →
 * review → order → receipt, plus declined payment, repeated clicks, timeout recovery with the
 * same Idempotency-Key and a pending order surviving a disconnection and a reload. Everything
 * goes through the UI; the simulated server is only used to choose scenarios and timing.
 */

const APE = 'Emerald Ape #042'
const ordersCount = (page: Page) => page.evaluate(() => window.__kurioMocks!.orders.list().length)
const reviewDialog = (page: Page) => page.getByRole('dialog', { name: 'Revise seu pedido' })

async function signedIn(page: Page, scenario?: ScenarioId) {
  await prepare(page, { scenario })
  await page.goto('/')
  await waitForMocks(page)
  await signInViaApi(page, 'ana')
}

/** From the checkout: confirm the form, wait for the review, return the confirm button. */
async function openReview(page: Page) {
  await expect(page.getByTestId('checkout-total')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(reviewDialog(page)).toBeVisible({ timeout: 10_000 })
  const confirm = reviewDialog(page).getByRole('button', { name: 'Confirmar pagamento' })
  await expect(confirm).toBeEnabled()
  return confirm
}

async function checkoutWithCart(page: Page, scenario?: ScenarioId) {
  await signedIn(page, scenario)
  await addToCart(page, 'emerald-ape-042', 'limited-50', 2)
  await page.goto('/checkout')
  return openReview(page)
}

test('ORD-03 ORD-04 RT-03: compra completa do catálogo ao recibo confirmado', async ({ page }) => {
  await signedIn(page)

  // Catalog → detail → add to cart.
  await page.goto('/')
  await page.getByRole('link', { name: new RegExp(APE) }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: APE })).toBeVisible()
  await page.getByRole('button', { name: /^comprar/i }).click()
  await expect(page.getByTestId('live-region-polite')).toContainText('adicionada ao carrinho')

  // Cart → payment.
  await page.goto('/cart')
  await expect(page.getByTestId('cart-line').filter({ hasText: APE })).toBeVisible()
  await expect(page.getByTestId('summary-total')).toContainText('1.206 ETH') // 1.19 + 0.016
  await page.getByTestId('checkout-cta').click()
  await expect(page).toHaveURL(/\/checkout$/)

  // Review → order (pending) → receipt (confirmed through order.updated).
  const confirm = await openReview(page)
  await expect(reviewDialog(page)).toContainText('1.206 ETH')
  await confirm.click()
  await expect(page).toHaveURL(/\/orders\/order-/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seus NFTs agora estão na sua carteira', { timeout: 10_000 })
  await expect(page.getByTestId('order-total')).toHaveText('1.206 ETH')
  await expect(page.getByTestId('order-tx-hash')).toHaveText(/^0x[0-9a-fA-F]{4}…[0-9a-fA-F]{4}$/)
  await expect(page.getByRole('link', { name: /Ver no Etherscan/ })).toHaveAttribute('href', /etherscan\.io\/tx\/0x/)
  expect(await ordersCount(page)).toBe(1)

  // Only the purchased quantity left the cart (ORD-04).
  await page.goto('/cart')
  await expect(page.getByText(/carrinho está vazio/i)).toBeVisible()
})

test('ORD-01 CHK-07: pagamento recusado mostra o motivo e preserva o carrinho', async ({ page }) => {
  const confirm = await checkoutWithCart(page, 'payment-declined')
  await confirm.click()
  await expect(page).toHaveURL(/\/orders\/order-/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Pagamento recusado/, { timeout: 10_000 })
  await expect(page.getByRole('link', { name: /Ver no Etherscan/ })).toHaveCount(0)
  await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
  await expect(page.getByTestId('cart-line').filter({ hasText: APE }).getByTestId('cart-quantity')).toHaveText('2')
})

test('CHK-06: cliques repetidos em "Confirmar pagamento" criam um único pedido', async ({ page }) => {
  await signedIn(page)
  await page.evaluate(() => window.__kurioMocks!.orders.hold(true))
  await addToCart(page, 'emerald-ape-042', 'limited-50', 2)
  await page.goto('/checkout')
  const confirm = await openReview(page)
  const posts: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') posts.push(request.url())
  })
  // Three clicks dispatched in the same task, before React can disable the button.
  await confirm.evaluate((button: HTMLButtonElement) => {
    button.click()
    button.click()
    button.click()
  })
  await expect(page).toHaveURL(/\/orders\/order-/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Aguardando confirmação/)
  expect(await ordersCount(page)).toBe(1)
  // The client guard sent a single request (the server rules are a second line of defense).
  expect(posts).toHaveLength(1)
})

test('CHK-06 ORD-06: timeout após criar o pedido — o cliente repete com a mesma chave e recupera o mesmo pedido', async ({ page }) => {
  const confirm = await checkoutWithCart(page, 'order-timeout')
  await page.evaluate(() => window.__kurioMocks!.orders.hold(true))
  const keys: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') {
      keys.push(request.headers()['idempotency-key'] ?? '')
    }
  })
  await confirm.click()
  await expect(page).toHaveURL(/\/orders\/order-/, { timeout: 15_000 })
  const orders = await page.evaluate(() => window.__kurioMocks!.orders.list())
  expect(orders).toHaveLength(1)
  expect(page.url()).toContain(orders[0]!.id)
  // The first request timed out on the client (4s); the retry reused the same key.
  expect(keys).toHaveLength(2)
  expect(keys[1]).toBe(keys[0])
})

test('ORD-02 RT-06: pedido pendente sobrevive à queda do Socket.IO e ao refresh, sem criar outra compra', async ({ page }) => {
  await signedIn(page)
  await page.evaluate(() => window.__kurioMocks!.orders.hold(true))
  await addToCart(page, 'emerald-ape-042', 'limited-50', 2)
  await page.goto('/checkout')
  await (await openReview(page)).click()
  await expect(page).toHaveURL(/\/orders\/order-/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Aguardando confirmação/)
  const url = page.url()

  await page.evaluate(() => window.__kurioMocks!.realtime.dropAllConnections({ refuse: true }))
  await page.evaluate(() => window.__kurioMocks!.orders.settle(undefined, 'confirmed'))
  await page.evaluate(() => window.__kurioMocks!.realtime.restoreConnections())
  await page.reload()
  await waitForMocks(page)
  expect(page.url()).toBe(url)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seus NFTs agora estão na sua carteira', { timeout: 10_000 })
  expect(await ordersCount(page)).toBe(1)

  // Going back to the checkout does not resurrect the attempt: the cart is empty now.
  await page.goto('/cart')
  await expect(page.getByText(/carrinho está vazio/i)).toBeVisible()
})
