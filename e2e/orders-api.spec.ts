import { expect, test, type Page } from '@playwright/test'
import { addToCart, ANA_WALLET, api, readyToOrder } from './support/commerce.ts'
import { prepare, setScenario, signInViaApi, waitForMocks } from './support/mocks.ts'

/**
 * Server rules of the simulated backend at the REST level (no screen involved): idempotent
 * orders, revalidation of the reviewed quote, partial cart removal, isolation between users,
 * coupons and the visitor-cart merge. The UI tests build on these guarantees.
 */

test.describe.configure({ mode: 'parallel' })
test.skip(({ isMobile }) => isMobile, 'REST-level rules do not depend on the viewport')

async function signedIn(page: Page, user: 'ana' | 'bruno' = 'ana') {
  await prepare(page)
  await page.goto('/status')
  await waitForMocks(page)
  await signInViaApi(page, user)
}

const orderOf = (page: Page, orderId: string) => api(page, 'GET', `/orders/${orderId}`)

test('ORD-06 CHK-06: mesma chave + mesmo corpo devolve o mesmo pedido; corpo diferente = 409', async ({ page }) => {
  await signedIn(page)
  await page.evaluate(() => window.__kurioMocks!.orders.hold(true))
  const { input } = await readyToOrder(page)
  const headers = { 'Idempotency-Key': 'key-ana-1' }

  const first = await api(page, 'POST', '/orders', { body: input, headers })
  expect(first.status).toBe(201)
  expect(first.body.status).toBe('pending')

  const replay = await api(page, 'POST', '/orders', { body: input, headers })
  expect(replay.status).toBe(200)
  expect(replay.body.id).toBe(first.body.id)

  const conflict = await api(page, 'POST', '/orders', {
    body: { ...input, buyer: { ...input.buyer, note: 'outro conteúdo' } },
    headers,
  })
  expect(conflict.status).toBe(409)
  expect(conflict.body.error.code).toBe('IDEMPOTENCY_CONFLICT')

  // A second attempt with a new key while the first is pending is refused, not duplicated.
  const another = await api(page, 'POST', '/orders', { body: input, headers: { 'Idempotency-Key': 'key-ana-2' } })
  expect(another.status).toBe(409)
  expect(another.body.error.code).toBe('ORDER_IN_PROGRESS')

  expect(await page.evaluate(() => window.__kurioMocks!.orders.list().length)).toBe(1)
})

test('CHK-05: preço alterado depois da cotação revisada → 409 QUOTE_STALE com a nova cotação', async ({ page }) => {
  await signedIn(page)
  const { input, quote } = await readyToOrder(page)
  await page.evaluate(() => window.__kurioMocks!.nft.setPrice('emerald-ape-042', '1.25', 'emerald-ape-042.limited-50'))

  const stale = await api(page, 'POST', '/orders', { body: input, headers: { 'Idempotency-Key': 'k-stale' } })
  expect(stale.status).toBe(409)
  expect(stale.body.error.code).toBe('QUOTE_STALE')
  const fresh = stale.body.error.details.quote
  expect(fresh.id).not.toBe(quote.id)
  expect(fresh.issues).toContainEqual(
    expect.objectContaining({ type: 'PRICE_CHANGED', previous: '1.19', current: '1.25' }),
  )
  expect(await page.evaluate(() => window.__kurioMocks!.orders.list().length)).toBe(0)

  // Confirming the new quote works.
  const ok = await api(page, 'POST', '/orders', { body: { ...input, quoteId: fresh.id }, headers: { 'Idempotency-Key': 'k-new' } })
  expect(ok.status).toBe(201)
})

test('CHK-05: taxa de rede e cupom alterados também invalidam a cotação', async ({ page }) => {
  await signedIn(page)
  await api(page, 'PUT', '/cart/coupon', { body: { code: 'KURIO10' } })
  const { input } = await readyToOrder(page)
  await page.evaluate(() => window.__kurioMocks!.setNetworkFee('ethereum', '0.02'))
  await api(page, 'DELETE', '/cart/coupon')

  const stale = await api(page, 'POST', '/orders', { body: input, headers: { 'Idempotency-Key': 'k-fee' } })
  expect(stale.status).toBe(409)
  const types = (stale.body.error.details.quote.issues as { type: string }[]).map((i) => i.type)
  expect(types).toEqual(expect.arrayContaining(['FEE_CHANGED', 'COUPON_CHANGED']))
})

test('ORD-04 MOCK-06: confirmado consome estoque e remove só as quantidades compradas do carrinho', async ({ page }) => {
  await signedIn(page)
  await page.evaluate(() => window.__kurioMocks!.orders.hold(true))
  const { input } = await readyToOrder(page)
  const created = await api(page, 'POST', '/orders', { body: input, headers: { 'Idempotency-Key': 'k-partial' } })
  // Added after the quote: must survive the purchase.
  await addToCart(page, 'emerald-ape-042', 'limited-50', 3)

  await page.evaluate((id) => window.__kurioMocks!.orders.settle(id, 'confirmed'), created.body.id)
  const order = await orderOf(page, created.body.id)
  expect(order.body.status).toBe('confirmed')
  expect(order.body.txHash).toMatch(/^0x[0-9a-f]{64}$/)
  expect(order.body.explorerUrl).toContain('etherscan.io/tx/')

  const cart = await api(page, 'GET', '/cart')
  expect(cart.body.items).toEqual([expect.objectContaining({ nftId: 'emerald-ape-042', quantity: 3 })])
  const stock = await page.evaluate(
    () => (window.__kurioMocks!.nft.get('emerald-ape-042') as { editions: { id: string; available: number }[] }).editions,
  )
  expect(stock.find((e) => e.id === 'emerald-ape-042.limited-50')!.available).toBe(10)
})

test('ORD-05: o recibo é um snapshot — mudar o catálogo depois não altera o pedido', async ({ page }) => {
  await signedIn(page)
  const { input } = await readyToOrder(page)
  const created = await api(page, 'POST', '/orders', { body: input, headers: { 'Idempotency-Key': 'k-snap' } })
  await page.evaluate((id) => window.__kurioMocks!.orders.settle(id, 'confirmed'), created.body.id)
  await page.evaluate(() => window.__kurioMocks!.nft.setPrice('emerald-ape-042', '9.99', 'emerald-ape-042.limited-50'))
  const order = await orderOf(page, created.body.id)
  expect(order.body.items[0]).toEqual(expect.objectContaining({ unitPrice: '1.19', lineTotal: '2.38' }))
  expect(order.body.total).toBe(created.body.total)
})

test('ORD-01 CHK-07: pagamento recusado termina declined e mantém o carrinho intacto', async ({ page }) => {
  await signedIn(page)
  await setScenario(page, 'payment-declined')
  const { input } = await readyToOrder(page)
  const before = await api(page, 'GET', '/cart')
  const created = await api(page, 'POST', '/orders', { body: input, headers: { 'Idempotency-Key': 'k-decl' } })
  await expect.poll(async () => (await orderOf(page, created.body.id)).body.status, { timeout: 6_000 }).toBe('declined')
  const after = await api(page, 'GET', '/cart')
  expect(after.body.items).toEqual(before.body.items)
})

test('CHK-06: timeout depois de criar o pedido — reenvio com a mesma chave recupera o mesmo pedido', async ({ page }) => {
  await signedIn(page)
  await setScenario(page, 'order-timeout')
  await page.evaluate(() => window.__kurioMocks!.orders.hold(true))
  const { input } = await readyToOrder(page)
  const headers = { 'Idempotency-Key': 'k-timeout' }

  const first = await api(page, 'POST', '/orders', { body: input, headers, timeoutMs: 4_000 })
  expect(first.status).toBe(0) // the client gave up; the server already created the order
  expect(await page.evaluate(() => window.__kurioMocks!.orders.list().length)).toBe(1)

  const retry = await api(page, 'POST', '/orders', { body: input, headers })
  expect(retry.status).toBe(200)
  expect(retry.ms).toBeLessThan(2_000)
  expect(await page.evaluate(() => window.__kurioMocks!.orders.list().length)).toBe(1)
  const active = await api(page, 'GET', '/orders/active')
  expect(active.body.order.id).toBe(retry.body.id)
})

test('ORD-02: pedido pendente é liquidado ao ser lido depois de um refresh', async ({ page }) => {
  await signedIn(page)
  const { input } = await readyToOrder(page)
  const created = await api(page, 'POST', '/orders', { body: input, headers: { 'Idempotency-Key': 'k-refresh' } })
  await page.reload() // the settlement timer of the previous page is gone
  await waitForMocks(page)
  await expect.poll(async () => (await orderOf(page, created.body.id)).body.status, { timeout: 6_000 }).toBe('confirmed')
})

test('AUTH-05: outro usuário não lê o pedido (403) nem o carrinho de Ana', async ({ page }) => {
  await signedIn(page, 'ana')
  const { input } = await readyToOrder(page)
  const created = await api(page, 'POST', '/orders', { body: input, headers: { 'Idempotency-Key': 'k-iso' } })
  await signInViaApi(page, 'bruno')
  const peek = await orderOf(page, created.body.id)
  expect(peek.status).toBe(403)
  expect(JSON.stringify(peek.body)).not.toContain('Ana')
  const brunoCart = await api(page, 'GET', '/cart')
  expect(brunoCart.body.items).toEqual([])
})

test('CHK-03: carteira desconectada no servidor bloqueia o pedido; recusa no cenário wallet-rejected', async ({ page }) => {
  await signedIn(page)
  const { input } = await readyToOrder(page)
  await page.evaluate(() => window.__kurioMocks!.wallets.disconnectAll())
  const refused = await api(page, 'POST', '/orders', { body: input, headers: { 'Idempotency-Key': 'k-wallet' } })
  expect(refused.status).toBe(422)
  expect(refused.body.error.code).toBe('WALLET_DISCONNECTED')

  await setScenario(page, 'wallet-rejected')
  const rejected = await api(page, 'POST', `/wallets/${ANA_WALLET.id}/connect`, { body: { network: 'ethereum', kind: 'metamask' } })
  expect(rejected.status).toBe(422)
  expect(rejected.body.error.code).toBe('WALLET_REJECTED')
})

test('CART-05 CART-06: cupom válido, inválido e expirado; cotação calcula desconto, taxa e total', async ({ page }) => {
  await prepare(page)
  await page.goto('/status')
  await waitForMocks(page)
  await addToCart(page, 'emerald-ape-042', 'limited-50', 2) // 2.38

  const invalid = await api(page, 'PUT', '/cart/coupon', { body: { code: 'NAOEXISTE' } })
  expect([invalid.status, invalid.body.error.code]).toEqual([422, 'COUPON_INVALID'])
  const expired = await api(page, 'PUT', '/cart/coupon', { body: { code: 'blackfriday' } })
  expect([expired.status, expired.body.error.code]).toEqual([422, 'COUPON_EXPIRED'])

  const applied = await api(page, 'PUT', '/cart/coupon', { body: { code: 'kurio10' } })
  expect(applied.body.couponCode).toBe('KURIO10')
  const quote = await api(page, 'POST', '/quote', { body: { network: 'ethereum' } })
  expect(quote.body).toEqual(
    expect.objectContaining({ subtotal: '2.38', discount: '0.238', networkFee: '0.016', total: '2.158', purchasable: true }),
  )
})

test('CART-04: carrinho do visitante é preservado (merge) ao autenticar', async ({ page }) => {
  await prepare(page)
  await page.goto('/status')
  await waitForMocks(page)
  await addToCart(page, 'emerald-ape-042', 'limited-50', 2)
  const guestCartId = await page.evaluate(() => localStorage.getItem('kurio.guestCartId'))
  await signInViaApi(page, 'ana')
  const merged = await api(page, 'POST', '/cart/merge', { body: { guestCartId } })
  expect(merged.body.items).toEqual([expect.objectContaining({ nftId: 'emerald-ape-042', quantity: 2 })])
  // Repeating the merge is a no-op (the visitor cart was retired).
  const again = await api(page, 'POST', '/cart/merge', { body: { guestCartId } })
  expect(again.body.items[0].quantity).toBe(2)
})
