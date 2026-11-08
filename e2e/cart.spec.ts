import { expect, test, type Page } from '@playwright/test'
import { addToCart, api } from './support/commerce.ts'
import { prepare, USERS, waitForMocks, type ScenarioId } from './support/mocks.ts'

/**
 * Carrinho (§3 "Carrinho"). Seed: `emerald-ape-042` 1/50 1.19 ETH (12, padrão), 1/10 2.38 ETH
 * (4); `violet-nomad-314` 1.39 ETH; cupons KURIO10 (10%), BLACKFRIDAY (expirado); taxa de rede
 * ethereum 0.016. Stock/price changes are made on the simulated server (`window.__kurioMocks`)
 * and reach the page through socket.io-client; nothing here touches the app's cache.
 */

const APE = 'emerald-ape-042'
const APE_NAME = 'Emerald Ape #042'
const NOMAD_NAME = 'Violet Nomad #314'

const line = (page: Page, name: string) => page.getByTestId('cart-line').filter({ hasText: name })
const quantity = (page: Page, name: string) => line(page, name).getByTestId('cart-quantity')
const plus = (page: Page, name: string) => page.getByRole('button', { name: `Aumentar quantidade de ${name}` })
const minus = (page: Page, name: string) => page.getByRole('button', { name: `Diminuir quantidade de ${name}` })
const removeButton = (page: Page, name: string) => page.getByRole('button', { name: `Remover ${name} do carrinho` })
const summary = (page: Page, field: 'subtotal' | 'discount' | 'fee' | 'total') => page.getByTestId(`summary-${field}`)
const checkout = (page: Page) => page.getByTestId('checkout-cta')
const couponInput = (page: Page) => page.getByLabel('Código promocional')
const polite = (page: Page) => page.getByTestId('live-region-polite')
const assertive = (page: Page) => page.getByTestId('live-region-assertive')

/** Opens /cart after putting items in the visitor (or signed-in) cart through the API. */
async function openCart(page: Page, setup?: (page: Page) => Promise<unknown>, scenario?: ScenarioId) {
  await prepare(page, { scenario })
  await page.goto('/cart')
  await waitForMocks(page)
  if (setup) {
    await setup(page)
    await page.reload()
    await waitForMocks(page)
  }
}

async function waitForSocket(page: Page) {
  await page.waitForFunction(() => (window.__kurioMocks?.realtime.connectionCount() ?? 0) > 0)
}

async function submitLogin(page: Page, { email, password }: { email: string; password: string }) {
  const form = page.getByRole('form', { name: 'Entrar' })
  await form.getByLabel('E-mail').fill(email)
  await form.getByLabel('Senha', { exact: true }).fill(password)
  await form.getByRole('button', { name: 'Entrar', exact: true }).click()
}

test.describe('Carrinho', () => {
  test('CART-01: adiciona pelo detalhe, altera a quantidade e remove pela UI', async ({ page }) => {
    await prepare(page)
    await page.goto(`/nft/${APE}`)
    await page.getByRole('button', { name: /^comprar/i }).click()
    await expect(polite(page)).toContainText('adicionada ao carrinho')

    await page.goto('/cart')
    await expect(line(page, APE_NAME)).toBeVisible()
    await expect(quantity(page, APE_NAME)).toHaveText('1')
    await expect(summary(page, 'subtotal')).toHaveText('1.19 ETH')

    await plus(page, APE_NAME).click()
    await expect(quantity(page, APE_NAME)).toHaveText('2')
    await expect(line(page, APE_NAME).getByTestId('cart-line-total')).toContainText('2.38 ETH')
    await expect(summary(page, 'subtotal')).toHaveText('2.38 ETH')
    await expect(polite(page)).toHaveText(`Quantidade de ${APE_NAME}: 2.`)

    await minus(page, APE_NAME).click()
    await expect(quantity(page, APE_NAME)).toHaveText('1')
    await expect(summary(page, 'subtotal')).toHaveText('1.19 ETH')

    await removeButton(page, APE_NAME).click()
    await expect(page.getByTestId('cart-empty')).toContainText('Seu carrinho está vazio')
    await expect(polite(page)).toHaveText(`${APE_NAME} removido do carrinho.`)
    await expect(page.getByRole('link', { name: 'Explorar o mercado' })).toBeVisible()
  })

  test('CART-02: o + fica desabilitado no limite da edição, com o motivo', async ({ page }) => {
    await openCart(page, (p) => addToCart(p, APE, 'limited-10', 3))
    await expect(quantity(page, APE_NAME)).toHaveText('3')
    await expect(plus(page, APE_NAME)).not.toHaveAttribute('aria-disabled', 'true')

    await plus(page, APE_NAME).click()
    await expect(quantity(page, APE_NAME)).toHaveText('4')
    await expect(plus(page, APE_NAME)).toHaveAttribute('aria-disabled', 'true')
    await expect(plus(page, APE_NAME)).toHaveAccessibleDescription(/Máximo disponível: 4 unidades/)

    // Activating it at the limit (keyboard focus stays on it) sends nothing and announces the reason.
    await plus(page, APE_NAME).press('Enter')
    await expect(polite(page)).toContainText('Limite atingido')
    await expect(quantity(page, APE_NAME)).toHaveText('4')
  })

  test('CART-02: 409 da API aparece na linha, em toast e no anúncio assertivo', async ({ page }) => {
    await openCart(page, (p) => addToCart(p, APE, 'limited-50', 2))
    await expect(quantity(page, APE_NAME)).toHaveText('2')
    await waitForSocket(page)
    // Without the socket the page does not learn about the new stock, so the PATCH reaches the 409.
    await page.evaluate(() => window.__kurioMocks!.realtime.dropAllConnections({ refuse: true }))
    await page.evaluate((id) => window.__kurioMocks!.nft.setAvailability(id, `${id}.limited-50`, 2), APE)

    await plus(page, APE_NAME).click()
    await expect(page.getByTestId('cart-line-notice')).toContainText('Só restam 2 unidade(s)')
    await expect(assertive(page)).toContainText(`Não foi possível alterar a quantidade de ${APE_NAME}`)
    await expect(page.getByText('Não foi possível alterar a quantidade', { exact: true })).toBeVisible()
    // The cart was reloaded after the 409: the quantity is the server's and + is now at the limit.
    await expect(quantity(page, APE_NAME)).toHaveText('2')
    await expect(plus(page, APE_NAME)).toHaveAttribute('aria-disabled', 'true')
    await page.evaluate(() => window.__kurioMocks!.realtime.restoreConnections())
  })

  test('CART-02 CART-07: estoque abaixo da quantidade bloqueia a compra e oferece "Ajustar"', async ({ page }) => {
    await openCart(page, (p) => addToCart(p, APE, 'limited-50', 3))
    await expect(checkout(page)).toHaveAttribute('href', '/checkout')
    await waitForSocket(page)
    await page.evaluate((id) => window.__kurioMocks!.nft.setAvailability(id, `${id}.limited-50`, 2), APE)

    const notices = page.getByTestId('cart-line-notice')
    await expect(notices).toContainText('Disponibilidade reduzida: restam 2 unidades (você tem 3).')
    await expect(notices).toContainText('Restam 2 unidades')
    await expect(assertive(page)).toContainText('Restam 2 unidades')
    await expect(checkout(page)).toHaveAttribute('aria-disabled', 'true')
    await expect(page.getByTestId('checkout-blocked')).toContainText('Ajuste os itens indicados')

    await page.getByRole('button', { name: `Ajustar ${APE_NAME} para 2` }).click()
    await expect(quantity(page, APE_NAME)).toHaveText('2')
    await expect(checkout(page)).toHaveAttribute('href', '/checkout')
    await expect(page.getByTestId('checkout-blocked')).toHaveCount(0)
  })

  test('CART-05 CART-06: cupom inválido, expirado, aplicado e removido; resumo igual à cotação', async ({ page }) => {
    await openCart(page, (p) => addToCart(p, APE, 'limited-50', 2))
    await expect(summary(page, 'total')).toHaveText('2.396 ETH')
    await expect(summary(page, 'discount')).toHaveText(/\(-\) 00\.00/)

    const input = couponInput(page)
    await input.fill('NAOEXISTE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    const error = page.getByTestId('coupon-error')
    await expect(error).toHaveText('O cupom NAOEXISTE não existe.')
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(input).toHaveAccessibleDescription('O cupom NAOEXISTE não existe.')
    await expect(assertive(page)).toHaveText('O cupom NAOEXISTE não existe.')

    await input.fill('BLACKFRIDAY')
    await expect(input).not.toHaveAttribute('aria-invalid', 'true')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(error).toHaveText('O cupom BLACKFRIDAY expirou.')
    await expect(input).toHaveAccessibleDescription('O cupom BLACKFRIDAY expirou.')

    await input.fill('kurio10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByTestId('coupon-applied')).toContainText('Cupom KURIO10 aplicado')
    await expect(page.getByRole('button', { name: 'Remover cupom' })).toBeFocused()
    await expect(summary(page, 'subtotal')).toHaveText('2.38 ETH')
    await expect(summary(page, 'discount')).toContainText('0.238 ETH')
    await expect(summary(page, 'fee')).toHaveText('0.016 ETH')
    await expect(summary(page, 'total')).toHaveText('2.158 ETH')

    // Exactly what the server quotes (CART-06).
    const quote = await api<{ subtotal: string; discount: string; networkFee: string; total: string }>(page, 'POST', '/quote', {
      body: { network: 'ethereum' },
    })
    expect(quote.body).toMatchObject({ subtotal: '2.38', discount: '0.238', networkFee: '0.016', total: '2.158' })

    await page.getByRole('button', { name: 'Remover cupom' }).click()
    await expect(couponInput(page)).toBeFocused()
    await expect(summary(page, 'discount')).toHaveText(/\(-\) 00\.00/)
    await expect(summary(page, 'total')).toHaveText('2.396 ETH')
    await expect(polite(page)).toHaveText('Cupom KURIO10 removido.')
  })

  test('CART-03: o carrinho sobrevive a refresh', async ({ page }) => {
    await openCart(page, async (p) => {
      await addToCart(p, APE, 'limited-50', 1)
      await addToCart(p, 'violet-nomad-314', 'default', 1)
    })
    await plus(page, APE_NAME).click()
    await expect(quantity(page, APE_NAME)).toHaveText('2')
    await page.reload()
    await expect(quantity(page, APE_NAME)).toHaveText('2')
    await expect(quantity(page, NOMAD_NAME)).toHaveText('1')
    await expect(summary(page, 'subtotal')).toHaveText('3.77 ETH')
  })

  test('CART-04: itens do visitante continuam no carrinho depois do login pela UI', async ({ page }) => {
    await openCart(page, async (p) => {
      await addToCart(p, APE, 'limited-50', 2)
      await addToCart(p, 'violet-nomad-314', 'default', 1)
    })
    await expect(line(page, NOMAD_NAME)).toBeVisible()
    await checkout(page).click()
    await expect(page).toHaveURL('/login?redirect=%2Fcheckout')
    await submitLogin(page, USERS.ana)
    await expect(page).toHaveURL(/\/checkout/)

    await page.goto('/cart')
    await expect(quantity(page, APE_NAME)).toHaveText('2')
    await expect(quantity(page, NOMAD_NAME)).toHaveText('1')
    // Server side: the lines now belong to Ana's cart.
    const cart = await api<{ items: { name: string; quantity: number }[] }>(page, 'GET', '/cart')
    expect(cart.body.items.map((i) => [i.name, i.quantity])).toEqual(
      expect.arrayContaining([
        [APE_NAME, 2],
        [NOMAD_NAME, 1],
      ]),
    )
  })

  test('CART-07: mudança de preço com o carrinho aberto atualiza a linha e o resumo e é anunciada', async ({ page }) => {
    await openCart(page, (p) => addToCart(p, APE, 'limited-50', 2))
    await expect(summary(page, 'total')).toHaveText('2.396 ETH')
    await waitForSocket(page)

    await page.evaluate((id) => window.__kurioMocks!.nft.setPrice(id, '1.25'), APE)

    const notice = page.getByTestId('cart-line-notice')
    await expect(notice).toContainText('Preço atualizado: 1.19 → 1.25 ETH')
    await expect(line(page, APE_NAME).getByTestId('cart-line-total')).toContainText('2.50 ETH')
    await expect(summary(page, 'subtotal')).toHaveText('2.50 ETH')
    await expect(summary(page, 'total')).toHaveText('2.516 ETH')
    await expect(polite(page)).toContainText(`${APE_NAME}, edição 1/50: Preço atualizado: 1.19 → 1.25 ETH.`)

    // The notice persists until dismissed.
    await page.getByRole('button', { name: `Dispensar aviso de ${APE_NAME}` }).click()
    await expect(notice).toHaveCount(0)
  })

  test('CART-07: edição esgotada em tempo real mostra "Esgotado" e bloqueia a finalização', async ({ page }) => {
    await openCart(page, (p) => addToCart(p, APE, 'limited-50', 1))
    await expect(checkout(page)).toHaveAttribute('href', '/checkout')
    await waitForSocket(page)
    await page.evaluate((id) => window.__kurioMocks!.nft.sellOut(id, `${id}.limited-50`), APE)

    await expect(page.getByTestId('cart-line-notice')).toContainText('Esgotado: remova este item para finalizar a compra.')
    await expect(page.getByTestId('cart-line-notice')).toContainText('Esgotado')
    await expect(assertive(page)).toContainText('Esgotado')
    await expect(checkout(page)).toHaveAttribute('aria-disabled', 'true')
    await page.getByRole('button', { name: `Remover ${APE_NAME} esgotado` }).click()
    await expect(page.getByTestId('cart-empty')).toBeVisible()
  })

  test('GEN-05 GEN-06: skeleton na rede lenta e carrinho vazio com link para o catálogo', async ({ page }) => {
    await prepare(page, { scenario: 'slow' })
    await page.goto('/cart')
    await expect(page.getByTestId('cart-skeleton')).toBeVisible()
    await expect(page.getByTestId('cart-empty')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('cart-skeleton')).toHaveCount(0)
    await page.getByRole('link', { name: 'Explorar o mercado' }).click()
    await expect(page).toHaveURL(/\/#catalogo$/)
  })

  test('GEN-06: falha ao carregar mostra erro com "Tentar novamente"', async ({ page }) => {
    await prepare(page)
    // The header reads the cart too: let that first read finish so it cannot consume the failures.
    const headerCart = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/cart')
    await page.goto('/status')
    await waitForMocks(page)
    await headerCart
    // A brand-new visitor cart (new X-Guest-Cart-Id) whose reads fail until cleared.
    await page.evaluate(() => {
      window.__kurioMocks!.failNext('GET /cart', { status: 500, code: 'INTERNAL_ERROR', times: 20 })
      localStorage.setItem('kurio.guestCartId', crypto.randomUUID())
    })
    await page.getByRole('banner').getByRole('link', { name: /^Carrinho/ }).click()
    await expect(page.getByRole('heading', { name: 'Não foi possível carregar o carrinho' })).toBeVisible({ timeout: 15_000 })
    await page.evaluate(() => window.__kurioMocks!.clearFailures())
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByTestId('cart-empty')).toBeVisible()
  })

  test('layout: sem overflow horizontal; mobile sem header global, tab bar e footer', async ({ page, isMobile }) => {
    await openCart(page, async (p) => {
      await addToCart(p, APE, 'limited-50', 2)
      await addToCart(p, 'violet-nomad-314', 'default', 1)
    })
    await expect(summary(page, 'total')).toBeVisible()
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(await overflow()).toBeLessThanOrEqual(0)

    if (isMobile) {
      await expect(page.getByRole('heading', { level: 1, name: 'Carrinho de NFTs' })).toBeVisible()
      await expect(page.getByRole('banner')).toBeHidden()
      await expect(page.getByRole('navigation', { name: 'Navegação inferior' })).toHaveCount(0)
      await expect(page.getByRole('contentinfo')).toBeHidden()
      await page.setViewportSize({ width: 768, height: 1000 })
    } else {
      await expect(page.getByRole('table', { name: 'Itens do carrinho' })).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Mercado' })).toHaveAttribute('aria-current', 'page')
      await expect(page.getByTestId('related-section')).toContainText('Colecionadores também viram')
      await page.setViewportSize({ width: 768, height: 1000 })
    }
    await expect(summary(page, 'total')).toBeVisible()
    expect(await overflow()).toBeLessThanOrEqual(0)
  })
})
