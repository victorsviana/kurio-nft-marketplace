import { expect, test, type Page } from '@playwright/test'
import { addToCart } from './support/commerce.ts'
import { prepare, setScenario, signInViaApi, USERS, waitForMocks, type ScenarioId } from './support/mocks.ts'

/**
 * §3 "Pagamento e confirmação" + §7 stale-quote scenario: validation, wallets, connection,
 * review, client-side revalidation (socket) and the server's 409 backstop.
 * Cart: Emerald Ape #042 · 1/50 at 1.19 ETH × 2 = 2.38 ETH; Ethereum fee 0.016, Polygon 0.002.
 */

const ANA_ADDRESS = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
const BRUNO_PRIMARY = '0x9b3a54d092f6b4b3d2ec676cd589f124e9921e71'
const BRUNO_SECONDARY = '0x5aeda56215b167893e80b4fe645ba6d5bab767de'

async function setup(page: Page, user: keyof typeof USERS = 'ana', options: { scenario?: ScenarioId } = {}) {
  await prepare(page, options)
  await page.goto('/')
  await waitForMocks(page)
  await signInViaApi(page, user)
  await addToCart(page, 'emerald-ape-042', 'limited-50', 2)
  await page.goto('/checkout')
  await expect(page.getByTestId('checkout-total')).toBeVisible({ timeout: 15_000 })
}

/** Mobile keeps the collector form in the collapsible "Dados do colecionador" section. */
async function openCollector(page: Page, isMobile: boolean) {
  if (!isMobile) return
  const toggle = page.getByRole('button', { name: /Dados do colecionador/ })
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
}

const confirmPurchase = (page: Page) => page.getByRole('button', { name: 'Confirmar compra' })
const reviewDialog = (page: Page) => page.getByRole('dialog', { name: 'Revise seu pedido' })
const confirmPayment = (page: Page) => reviewDialog(page).getByRole('button', { name: 'Confirmar pagamento' })
const connectionStatus = (page: Page) => page.getByTestId('connection-status')

async function openReview(page: Page) {
  await confirmPurchase(page).click()
  await expect(reviewDialog(page)).toBeVisible()
}

async function selectOption(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label, exact: true }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

const waitForSocket = (page: Page) => page.waitForFunction(() => window.__kurioMocks!.realtime.connectionCount() > 0)

test.describe('Checkout', () => {
  test('CHK-01: guest is sent to login and comes back to the checkout', async ({ page }) => {
    await prepare(page)
    await page.goto('/checkout')
    await waitForMocks(page)
    await expect(page).toHaveURL('/login?redirect=%2Fcheckout')

    const form = page.getByRole('form', { name: 'Entrar' })
    await form.getByLabel('E-mail').fill(USERS.ana.email)
    await form.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
    await form.getByRole('button', { name: 'Entrar', exact: true }).click()

    await expect(page).toHaveURL('/checkout')
    // Ana's cart is empty in the seed: the checkout explains it instead of a blank form.
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver carrinho' })).toHaveAttribute('href', '/cart')
  })

  test('WAL-03: collector form is prefilled from the profile and the primary wallet (Ana)', async ({ page, isMobile }) => {
    await setup(page, 'ana')
    await openCollector(page, isMobile)
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana Ribeiro')
    await expect(page.getByLabel('Nome de usuário')).toHaveValue('ana.ribeiro')
    await expect(page.getByLabel('E-mail')).toHaveValue('ana@kurio.dev')
    await expect(page.getByLabel('Nome do perfil')).toHaveValue('anaribeiro')
    await expect(page.getByRole('combobox', { name: 'Nome ENS' })).toHaveText('.eth')
    await expect(page.getByLabel('Endereço da carteira')).toHaveValue(ANA_ADDRESS)
    await expect(page.getByRole('combobox', { name: 'Rede', exact: true })).toHaveText('Ethereum')
    await expect(page.getByRole('combobox', { name: 'Tipo de carteira' })).toHaveText('MetaMask')
    // The connector options share the same field as the "Tipo de carteira" select.
    await expect(page.getByRole('radio', { name: 'MetaMask', exact: true })).toBeChecked()
    // No secondary wallet: the switch explains why and links to the wallets page.
    await expect(page.getByRole('checkbox', { name: 'Usar outra carteira?' })).toBeDisabled()
    await expect(page.getByRole('link', { name: 'Cadastrar carteira' }).first()).toHaveAttribute('href', '/account/wallets')

    await page.getByRole('radio', { name: 'Coinbase Wallet', exact: true }).click()
    await expect(page.getByRole('combobox', { name: 'Tipo de carteira' })).toHaveText('Coinbase Wallet')
  })

  test('WAL-03: Bruno switches to the secondary wallet and the network fee follows (polygon → ethereum)', async ({ page, isMobile }) => {
    await setup(page, 'bruno')
    await openCollector(page, isMobile)
    await expect(page.getByLabel('Endereço da carteira')).toHaveValue(BRUNO_PRIMARY)
    await expect(page.getByRole('combobox', { name: 'Rede', exact: true })).toHaveText('Polygon')
    await expect(page.getByRole('combobox', { name: 'Tipo de carteira' })).toHaveText('Coinbase Wallet')
    // Fee from the API for the wallet's network: 2.38 + 0.002.
    await expect(page.getByTestId('checkout-total')).toHaveText('2.382 ETH')

    if (isMobile) await page.getByRole('radio', { name: /^Reserva/ }).click()
    else await page.getByRole('checkbox', { name: 'Usar outra carteira?' }).check()

    await expect(page.getByLabel('Endereço da carteira')).toHaveValue(BRUNO_SECONDARY)
    await expect(page.getByRole('combobox', { name: 'Rede', exact: true })).toHaveText('Ethereum')
    await expect(page.getByRole('combobox', { name: 'Tipo de carteira' })).toHaveText('WalletConnect')
    await expect(page.getByTestId('checkout-total')).toHaveText('2.396 ETH')
  })

  test('CHK-03: changing the network re-prices the quote with the API fee', async ({ page, isMobile }) => {
    await setup(page, 'ana')
    await expect(page.getByTestId('checkout-total')).toHaveText('2.396 ETH')
    await openCollector(page, isMobile)
    await selectOption(page, 'Rede', 'Polygon')
    await expect(page.getByTestId('checkout-total')).toHaveText('2.382 ETH')
    if (!isMobile) await expect(page.getByText('0.002 ETH')).toBeVisible()
  })

  test('CHK-02: required and invalid fields show messages linked to the fields', async ({ page, isMobile }) => {
    await setup(page, 'ana')
    await openCollector(page, isMobile)
    const displayName = page.getByLabel('Nome de exibição')
    const address = page.getByLabel('Endereço da carteira')
    await displayName.fill('')
    await address.fill('0x123')
    if (isMobile) await page.getByRole('button', { name: /Dados do colecionador/ }).click() // collapse it

    await confirmPurchase(page).click()

    await expect(displayName).toHaveAttribute('aria-invalid', 'true')
    await expect(displayName).toHaveAccessibleDescription('Informe o nome de exibição')
    await expect(displayName).toBeFocused() // section re-expanded and the first invalid field focused
    await expect(address).toHaveAttribute('aria-invalid', 'true')
    await expect(address).toHaveAccessibleDescription(/Endereço inválido/)
    await expect(reviewDialog(page)).toBeHidden()
    await expect(page.getByTestId('live-region-assertive')).toHaveText('Revise os 2 campos destacados.')
    expect(await page.evaluate(() => window.__kurioMocks!.wallets.connections().length)).toBe(0)

    // Fixing a field clears its error while typing.
    await displayName.fill('Ana Ribeiro')
    await expect(displayName).not.toHaveAttribute('aria-invalid', 'true')
  })

  test('CHK-03: connects the wallet, disconnects it and reconnects on the next confirmation', async ({ page }) => {
    await setup(page, 'ana')
    await openReview(page)
    expect(await page.evaluate(() => window.__kurioMocks!.wallets.connections().length)).toBe(1)
    await reviewDialog(page).getByRole('button', { name: 'Voltar e editar' }).click()
    await expect(reviewDialog(page)).toBeHidden()

    await expect(connectionStatus(page)).toContainText('Carteira conectada: MetaMask')
    await connectionStatus(page).getByRole('button', { name: 'Desconectar' }).click()
    await expect(connectionStatus(page)).toContainText('Carteira desconectada')
    await expect.poll(() => page.evaluate(() => window.__kurioMocks!.wallets.connections().length)).toBe(0)

    await openReview(page)
    expect(await page.evaluate(() => window.__kurioMocks!.wallets.connections().length)).toBe(1)
  })

  test('CHK-03: a refused connection is shown with retry, never as success', async ({ page }) => {
    await setup(page, 'ana', { scenario: 'wallet-rejected' })
    await confirmPurchase(page).click()
    await expect(connectionStatus(page)).toContainText('A carteira recusou a conexão')
    await expect(connectionStatus(page).getByRole('button', { name: 'Escolher outra carteira' })).toBeVisible()
    await expect(reviewDialog(page)).toBeHidden()
    expect(await page.evaluate(() => window.__kurioMocks!.wallets.connections().length)).toBe(0)

    await setScenario(page, 'default')
    await connectionStatus(page).getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(connectionStatus(page)).toContainText('Carteira conectada')
  })

  test('CHK-03: wallet disconnected on the server → reconnect prompt, then the order goes through', async ({ page }) => {
    await setup(page, 'ana')
    await page.evaluate(() => window.__kurioMocks!.orders.hold(true))
    await openReview(page)
    await page.evaluate(() => window.__kurioMocks!.wallets.disconnectAll())

    await confirmPayment(page).click()
    await expect(reviewDialog(page).getByTestId('review-status')).toContainText('A carteira foi desconectada')
    await reviewDialog(page).getByRole('button', { name: 'Reconectar carteira' }).click()
    await expect(reviewDialog(page).getByTestId('review-status')).toBeHidden()

    await confirmPayment(page).click()
    await expect(page).toHaveURL(/\/orders\/order-[\w-]+$/)
  })

  test('CHK-04: review lists items, wallet, network, buyer and the quote totals; a pending order blocks a new one', async ({ page }) => {
    await setup(page, 'ana')
    await page.evaluate(() => window.__kurioMocks!.orders.hold(true))
    await openReview(page)
    const dialog = reviewDialog(page)
    await expect(dialog.getByRole('list', { name: 'Itens revisados' })).toContainText('Emerald Ape #042')
    await expect(dialog.getByRole('list', { name: 'Itens revisados' })).toContainText('1.19 ETH (x 2)')
    await expect(dialog).toContainText('Principal · MetaMask · 0x1f98...F984')
    await expect(dialog).toContainText('Ethereum')
    await expect(dialog).toContainText('Ana Ribeiro · ana@kurio.dev')
    const totals = dialog.getByTestId('review-totals')
    await expect(totals).toContainText('Subtotal2.38 ETH')
    await expect(totals).toContainText('Taxa de rede0.016 ETH')
    await expect(totals).toContainText('Total2.396 ETH')

    await confirmPayment(page).click()
    await expect(page).toHaveURL(/\/orders\/order-[\w-]+$/)
    const orders = await page.evaluate(() => window.__kurioMocks!.orders.list())
    expect(orders).toHaveLength(1)
    expect(orders[0]!.total).toBe('2.396')

    await page.goto('/checkout')
    await expect(page.getByTestId('pending-order-notice')).toContainText('Você tem um pedido aguardando confirmação')
    await expect(confirmPurchase(page)).toBeDisabled()
  })

  test('RT-09/CHK-05: a price change during the review blocks confirmation until the new values are accepted', async ({ page }) => {
    await setup(page, 'ana')
    await waitForSocket(page)
    await page.evaluate(() => window.__kurioMocks!.orders.hold(true))
    await openReview(page)

    await page.evaluate(() => window.__kurioMocks!.nft.setPrice('emerald-ape-042', '1.25', 'emerald-ape-042.limited-50'))

    const stale = reviewDialog(page).getByTestId('stale-quote')
    await expect(stale).toContainText('Emerald Ape #042 · 1/50: preço 1.19 → 1.25 ETH')
    await expect(confirmPayment(page)).toBeDisabled()
    // The reviewed numbers are never swapped silently.
    await expect(reviewDialog(page).getByTestId('review-totals')).toContainText('Total2.396 ETH')
    await expect(stale).toContainText('Novo total: 2.516 ETH')
    await expect(page.getByTestId('review-live-region')).toContainText('Os valores mudaram')

    await stale.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await expect(stale).toBeHidden()
    await expect(reviewDialog(page).getByTestId('review-totals')).toContainText('Total2.516 ETH')
    await expect(confirmPayment(page)).toBeEnabled()

    await confirmPayment(page).click()
    await expect(page).toHaveURL(/\/orders\/order-[\w-]+$/)
    const orders = await page.evaluate(() => window.__kurioMocks!.orders.list())
    expect(orders[0]!.total).toBe('2.516')
  })

  test('RT-09/CHK-05: edição esgotada durante a revisão bloqueia a confirmação e oferece voltar ao carrinho', async ({ page }) => {
    await setup(page, 'ana')
    await waitForSocket(page)
    await openReview(page)

    await page.evaluate(() => window.__kurioMocks!.nft.sellOut('emerald-ape-042', 'emerald-ape-042.limited-50'))

    const stale = reviewDialog(page).getByTestId('stale-quote')
    await expect(stale).toContainText('Emerald Ape #042 · 1/50: edição esgotada')
    await expect(confirmPayment(page)).toBeDisabled()
    await expect(stale.getByRole('button', { name: 'Aceitar novos valores' })).toHaveCount(0)
    await reviewDialog(page).getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(page).toHaveURL(/\/cart$/)
    expect(await page.evaluate(() => window.__kurioMocks!.orders.list().length)).toBe(0)
  })

  test('CHK-05: with the socket down, the server 409 backstop shows the same stale UI (no auto-retry)', async ({ page }) => {
    await setup(page, 'ana')
    await waitForSocket(page)
    await page.evaluate(() => window.__kurioMocks!.orders.hold(true))
    await openReview(page)
    await page.evaluate(() => {
      window.__kurioMocks!.realtime.dropAllConnections({ refuse: true })
      window.__kurioMocks!.nft.setPrice('emerald-ape-042', '1.25', 'emerald-ape-042.limited-50')
    })

    await confirmPayment(page).click()
    const stale = reviewDialog(page).getByTestId('stale-quote')
    await expect(stale).toContainText('preço 1.19 → 1.25 ETH')
    await expect(confirmPayment(page)).toBeDisabled()
    expect(await page.evaluate(() => window.__kurioMocks!.orders.list().length)).toBe(0)

    await stale.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await expect(confirmPayment(page)).toBeEnabled()
    await confirmPayment(page).click()
    await expect(page).toHaveURL(/\/orders\/order-[\w-]+$/)
  })

  test('AUTH-04: typed values survive a reload (draft kept for resumption)', async ({ page, isMobile }) => {
    await setup(page, 'ana')
    await openCollector(page, isMobile)
    await page.getByLabel('Observação do colecionador (opcional)').fill('Entregar na carteira fria')
    await page.getByLabel('Código de indicação').fill('AMIGO2026')
    await page.reload()
    await expect(page.getByTestId('checkout-total')).toBeVisible()
    await openCollector(page, isMobile)
    await expect(page.getByLabel('Observação do colecionador (opcional)')).toHaveValue('Entregar na carteira fria')
    await expect(page.getByLabel('Código de indicação')).toHaveValue('AMIGO2026')
  })

  test('AUTH-04: session expiring during the checkout goes to login and resumes with the typed values', async ({ page, isMobile }) => {
    await setup(page, 'ana')
    await openCollector(page, isMobile)
    await page.getByLabel('Observação do colecionador (opcional)').fill('Entregar na carteira fria')
    await page.getByLabel('Código de indicação').fill('AMIGO2026')
    await page.evaluate(() => window.__kurioMocks!.expireSessions())

    await confirmPurchase(page).click()
    await expect(page).toHaveURL('/login?redirect=%2Fcheckout&reason=expired')

    const form = page.getByRole('form', { name: 'Entrar' })
    await form.getByLabel('E-mail').fill(USERS.ana.email)
    await form.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
    await form.getByRole('button', { name: 'Entrar', exact: true }).click()

    await expect(page).toHaveURL('/checkout')
    await expect(page.getByTestId('checkout-total')).toBeVisible()
    await openCollector(page, isMobile)
    await expect(page.getByLabel('Observação do colecionador (opcional)')).toHaveValue('Entregar na carteira fria')
    await expect(page.getByLabel('Código de indicação')).toHaveValue('AMIGO2026')
  })

  test('RT-09: a price change outside the review is announced and the summary is updated from the API', async ({ page }) => {
    await setup(page, 'ana')
    await waitForSocket(page)
    await expect(page.getByTestId('checkout-total')).toHaveText('2.396 ETH')
    await page.evaluate(() => window.__kurioMocks!.nft.setPrice('emerald-ape-042', '1.25', 'emerald-ape-042.limited-50'))
    await expect(page.getByTestId('update-notice')).toContainText('Emerald Ape #042')
    await expect(page.getByTestId('checkout-total')).toHaveText('2.516 ETH')
  })

  test('layout: no horizontal overflow and the global mobile chrome is hidden', async ({ page, isMobile }) => {
    await setup(page, 'ana')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    if (isMobile) {
      await expect(page.getByRole('heading', { level: 1, name: 'Pagamento com carteira' })).toBeVisible()
      await expect(page.getByRole('contentinfo')).toBeHidden()
    } else {
      await expect(page.getByRole('navigation', { name: 'Trilha de navegação' })).toContainText('Início/Mercado/Pagamento')
    }
  })
})
