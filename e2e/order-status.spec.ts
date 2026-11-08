import { expect, test, type Page } from '@playwright/test'
import { formatReceiptDate, shortHash } from '../src/features/orders/lib/format-order.ts'
import { formatEth } from '../src/shared/lib/format.ts'
import { api, ANA_WALLET, readyToOrder } from './support/commerce.ts'
import { prepare, signInViaApi, waitForMocks } from './support/mocks.ts'

/**
 * Order status screen `/orders/$orderId` (ORD-01..ORD-05, RT-03, RT-05, RT-06, AUTH-05).
 * Orders are created through the simulated REST API (as Ana) with settlement held, so each
 * test decides when the server settles them; the screen only learns about it through
 * Socket.IO (`order.updated`) or REST.
 */

test.describe.configure({ mode: 'parallel' })

interface OrderDto {
  id: string
  status: string
  txHash: string | null
  explorerUrl: string | null
  confirmedAt: string | null
  total: string
  networkFee: string
  items: { name: string; quantity: number; lineTotal: string }[]
}

async function anaWithPendingOrder(page: Page): Promise<OrderDto> {
  await prepare(page)
  await page.goto('/status')
  await waitForMocks(page)
  await signInViaApi(page, 'ana')
  await page.evaluate(() => window.__kurioMocks!.orders.hold(true))
  const { input } = await readyToOrder(page)
  const created = await api<OrderDto>(page, 'POST', '/orders', {
    body: input,
    headers: { 'Idempotency-Key': `e2e-order-status-${crypto.randomUUID()}` },
  })
  expect(created.status).toBe(201)
  expect(created.body.status).toBe('pending')
  return created.body
}

const settle = (page: Page, orderId: string, outcome: 'confirmed' | 'declined') =>
  page.evaluate(([id, result]) => window.__kurioMocks!.orders.settle(id, result), [orderId, outcome] as const)

const fetchOrder = async (page: Page, orderId: string) => (await api<OrderDto>(page, 'GET', `/orders/${orderId}`)).body

const card = (page: Page) => page.getByTestId('order-status')
const heading = (page: Page) => page.getByRole('heading', { level: 1 })

/** Waits until the app's socket is connected (polling is off, so changes come by event). */
async function waitForRealtime(page: Page) {
  await page.waitForFunction(() => (window.__kurioMocks?.realtime.connectionCount() ?? 0) > 0)
  await expect(page.getByTestId('order-live-hint')).toContainText('Conectado em tempo real')
}

/** Counts how many times the polite live region starts saying `text`. */
async function countAnnouncements(page: Page, text: string) {
  await page.evaluate((needle) => {
    const region = document.querySelector('[data-testid="live-region-polite"]')!
    const state = window as unknown as { __announced: number }
    state.__announced = 0
    let had = false
    new MutationObserver(() => {
      const has = region.textContent?.includes(needle) ?? false
      if (has && !had) state.__announced += 1
      had = has
    }).observe(region, { childList: true, characterData: true, subtree: true })
  }, text)
  return () => page.evaluate(() => (window as unknown as { __announced: number }).__announced)
}

test('ORD-01: pedido pendente tem representação própria (sem confirmação nem explorer)', async ({ page }) => {
  const order = await anaWithPendingOrder(page)
  await page.goto(`/orders/${order.id}`)

  await expect(card(page)).toHaveAttribute('data-status', 'pending')
  await expect(heading(page)).toHaveText('Aguardando confirmação da rede')
  await expect(heading(page)).toBeFocused()
  await expect(card(page)).toContainText('atualizada automaticamente')
  await expect(card(page)).toContainText(order.id.replace(/^order-/, '#'))
  await expect(page.getByTestId('order-line')).toHaveCount(order.items.length)
  await expect(page.getByTestId('order-items')).toContainText('Emerald Ape #042')
  await expect(page.getByTestId('order-total')).toHaveText(formatEth(order.total))
  await expect(card(page)).toContainText('MetaMask')

  await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Ver no Etherscan/ })).toHaveCount(0)
})

test('RT-03 ORD-03: order.updated pelo socket leva o pedido aberto à confirmação, sem recarregar', async ({ page, isMobile }) => {
  const order = await anaWithPendingOrder(page)
  await page.goto(`/orders/${order.id}`)
  await expect(card(page)).toHaveAttribute('data-status', 'pending')
  await waitForRealtime(page)
  const announced = await countAnnouncements(page, 'Pedido confirmado')

  let reloaded = false
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) reloaded = true
  })
  await settle(page, order.id, 'confirmed')

  // Polling only runs while the socket is down, so this can only come from the event.
  await expect(card(page)).toHaveAttribute('data-status', 'confirmed', { timeout: 3_000 })
  expect(reloaded).toBe(false)
  await expect(heading(page)).toHaveText('Seus NFTs agora estão na sua carteira')
  await expect(heading(page)).toBeFocused()
  await expect.poll(announced).toBe(1)

  const final = await fetchOrder(page, order.id)
  expect(final.status).toBe('confirmed')
  const explorer = page.getByRole('link', { name: /Ver no Etherscan/ })
  await expect(explorer).toHaveAttribute('href', final.explorerUrl!)
  await expect(explorer).toHaveAttribute('target', '_blank')
  await expect(explorer).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(explorer).toContainText('(simulado, abre em nova aba)')

  await expect(page.getByTestId('order-tx-hash')).toHaveText(shortHash(final.txHash!))
  await expect(card(page)).toContainText(final.txHash!) // full hash for assistive tech
  await expect(page.getByTestId('order-date')).toHaveText(formatReceiptDate(final.confirmedAt!))
  await expect(card(page)).toContainText('MetaMask')
  await expect(page.getByTestId('order-total')).toHaveText(formatEth(final.total))
  await expect(page.getByTestId('order-totals')).toContainText(formatEth(final.networkFee))
  for (const line of final.items) {
    const row = page.getByTestId('order-line').filter({ hasText: line.name })
    await expect(row).toContainText(`(x ${line.quantity})`)
    await expect(row).toContainText(formatEth(line.lineTotal))
  }
  await expect(card(page)).toContainText('Transação confirmada na Ethereum.')

  if (!isMobile) await page.screenshot({ path: '.scratch-orders/confirmed-1440.png', fullPage: true })
  else await page.screenshot({ path: '.scratch-orders/confirmed-390.png', fullPage: true })
})

test('ORD-01 RT-03: pedido recusado mostra o motivo, preserva o carrinho e oferece nova tentativa', async ({ page }) => {
  const order = await anaWithPendingOrder(page)
  await page.goto(`/orders/${order.id}`)
  await expect(card(page)).toHaveAttribute('data-status', 'pending')
  await waitForRealtime(page)

  await settle(page, order.id, 'declined')

  await expect(card(page)).toHaveAttribute('data-status', 'declined', { timeout: 3_000 })
  await expect(heading(page)).toHaveText('Pagamento recusado')
  await expect(heading(page)).toBeFocused()
  await expect(page.getByTestId('order-decline-reason')).toHaveText('Pagamento recusado pela carteira na simulação.')
  await expect(card(page)).toContainText('Nenhum valor foi cobrado e os itens continuam no seu carrinho.')
  await expect(page.getByTestId('live-region-assertive')).toContainText('Pagamento recusado')
  await expect(page.getByRole('link', { name: 'Voltar ao carrinho' })).toHaveAttribute('href', '/cart')
  await expect(page.getByRole('link', { name: 'Tentar novamente' })).toHaveAttribute('href', '/checkout')
  await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Ver no/ })).toHaveCount(0)

  // CHK-07: the server kept the cart lines.
  const cart = await api<{ items: unknown[] }>(page, 'GET', '/cart')
  expect(cart.body.items.length).toBe(order.items.length)
})

test('ORD-02: refresh com pedido pendente mantém o mesmo pedido e chega ao estado final', async ({ page }) => {
  const order = await anaWithPendingOrder(page)
  await page.goto(`/orders/${order.id}`)
  await expect(card(page)).toHaveAttribute('data-status', 'pending')

  await page.reload()
  await waitForMocks(page)
  await expect(card(page)).toHaveAttribute('data-status', 'pending')
  await expect(card(page)).toContainText(order.id.replace(/^order-/, '#'))
  await expect(page.getByTestId('order-total')).toHaveText(formatEth(order.total))
  await waitForRealtime(page)

  await settle(page, order.id, 'confirmed')
  await expect(card(page)).toHaveAttribute('data-status', 'confirmed')
  await expect(page.getByTestId('order-tx-hash')).toBeVisible()
})

test('RT-06 ORD-02: com o socket fora, o pedido liquidado é reconciliado (polling + reconexão)', async ({ page }) => {
  const order = await anaWithPendingOrder(page)
  await page.goto(`/orders/${order.id}`)
  await waitForRealtime(page)

  await page.evaluate(() => window.__kurioMocks!.realtime.dropAllConnections({ refuse: true }))
  await expect(page.getByTestId('order-live-hint')).toContainText('indisponível')
  await settle(page, order.id, 'confirmed')
  await page.evaluate(() => window.__kurioMocks!.realtime.restoreConnections())

  // Either the 4s fallback polling or the REST reconciliation on reconnect gets it.
  await expect(card(page)).toHaveAttribute('data-status', 'confirmed', { timeout: 15_000 })
  await expect(page.getByRole('link', { name: /Ver no Etherscan/ })).toHaveAttribute('href', /etherscan\.io\/tx\/0x/)
  await expect.poll(() => page.evaluate(() => window.__kurioMocks!.realtime.connectionCount()), { timeout: 15_000 }).toBeGreaterThan(0)
})

test('RT-05: evento repetido depois da confirmação não regride nem anuncia de novo', async ({ page }) => {
  const order = await anaWithPendingOrder(page)
  await page.goto(`/orders/${order.id}`)
  await waitForRealtime(page)
  const announced = await countAnnouncements(page, 'Pedido confirmado')

  await settle(page, order.id, 'confirmed')
  await expect(card(page)).toHaveAttribute('data-status', 'confirmed')
  await expect(page.getByTestId('live-region-polite')).toContainText('Pedido confirmado')
  await expect.poll(announced).toBe(1)

  await page.evaluate(() => window.__kurioMocks!.realtime.replayLastEvent())
  await page.waitForTimeout(1_000)
  await expect(card(page)).toHaveAttribute('data-status', 'confirmed')
  expect(await announced()).toBe(1)
})

test('AUTH-05: outro usuário abrindo o pedido vê "Pedido não encontrado" e nenhum dado', async ({ page }) => {
  const order = await anaWithPendingOrder(page)
  await settle(page, order.id, 'confirmed')
  const final = await fetchOrder(page, order.id)

  await signInViaApi(page, 'bruno')
  await page.goto(`/orders/${order.id}`)

  await expect(page.getByTestId('order-not-found')).toBeVisible()
  await expect(heading(page)).toHaveText('Pedido não encontrado')
  await expect(page.getByRole('link', { name: 'Voltar ao início', exact: true })).toHaveAttribute('href', '/')
  const text = (await page.locator('main').textContent()) ?? ''
  for (const leaked of ['Emerald Ape', 'Violet Nomad', ANA_WALLET.address, formatEth(final.total), 'outra conta', 'MetaMask']) {
    expect(text).not.toContain(leaked)
  }
  expect(text).not.toContain(final.txHash!.slice(2, 6).toUpperCase())
})

test('ORD-05: o recibo é o snapshot do pedido; mudar o preço no catálogo não o altera', async ({ page }) => {
  const order = await anaWithPendingOrder(page)
  await settle(page, order.id, 'confirmed')
  await page.goto(`/orders/${order.id}`)
  await expect(card(page)).toHaveAttribute('data-status', 'confirmed')
  const before = {
    lines: (await page.getByTestId('order-items').textContent()) ?? '',
    totals: (await page.getByTestId('order-totals').textContent()) ?? '',
  }

  await page.evaluate(() => window.__kurioMocks!.nft.setPrice('emerald-ape-042', '9.99', 'emerald-ape-042.limited-50'))
  await page.reload()
  await waitForMocks(page)

  await expect(card(page)).toHaveAttribute('data-status', 'confirmed')
  await expect(page.getByTestId('order-items')).toHaveText(before.lines)
  await expect(page.getByTestId('order-totals')).toHaveText(before.totals)
  await expect(page.getByTestId('order-items')).not.toContainText('9.99')
  await expect(page.getByTestId('order-total')).toHaveText(formatEth(order.total))
})

test('GEN-04: sem overflow horizontal no recibo (390, 768 e 1440 px)', async ({ page, isMobile }) => {
  const order = await anaWithPendingOrder(page)
  await settle(page, order.id, 'confirmed')
  await page.goto(`/orders/${order.id}`)
  await expect(card(page)).toHaveAttribute('data-status', 'confirmed')

  const widths = isMobile ? [390] : [768, 1440]
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    const box = (await card(page).boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    // Nothing inside the card is cut off on the right.
    const inner = await card(page).evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(inner).toBeLessThanOrEqual(0)
  }
})
