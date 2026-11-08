import { expect, test, type Page } from '@playwright/test'
import { prepare, setScenario, waitForMocks } from './support/mocks.ts'

/**
 * Detalhe do NFT (T2.8). Seed: `emerald-ape-042` — 1/1 5.95 ETH esgotada, 1/10 2.38 ETH (4),
 * 1/50 1.19 ETH (12, padrão), ABERTA 0.595 ETH (500); 19 avaliações; coleção Kurio Apes.
 * Realtime changes are triggered on the simulated server (`window.__kurioMocks`) and reach the
 * page through socket.io-client; nothing here touches the app's cache or components.
 */

const NFT = 'emerald-ape-042'
const LIMITED_10 = `${NFT}.limited-10`

const title = (page: Page) => page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })
const price = (page: Page) => page.getByTestId('nft-price')
const quantity = (page: Page) => page.getByTestId('nft-quantity')
const plus = (page: Page) => page.getByRole('button', { name: 'Aumentar quantidade' })
const minus = (page: Page) => page.getByRole('button', { name: 'Diminuir quantidade' })
const buyButton = (page: Page) => page.getByRole('button', { name: /^comprar/i })
const notice = (page: Page) => page.getByTestId('purchase-notice')
const edition = (page: Page, label: string) => page.getByTestId(`edition-${label}`)

async function openDetail(page: Page, nftId = NFT) {
  await prepare(page)
  await page.goto(`/nft/${nftId}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

/** Waits until the simulated Socket.IO server has a peer for this page. */
async function waitForSocket(page: Page) {
  await waitForMocks(page)
  await page.waitForFunction(() => (window.__kurioMocks?.realtime.connectionCount() ?? 0) > 0)
}

test.describe('Detalhe do NFT', () => {
  test('NFT-02 GEN-02: abre por URL direta e sobrevive a refresh', async ({ page }) => {
    await openDetail(page)
    await expect(title(page)).toBeVisible()
    await expect(price(page)).toHaveText(/1\.19 ETH/)
    await page.reload()
    await expect(title(page)).toBeVisible()
    await expect(price(page)).toHaveText(/1\.19 ETH/)
  })

  test('NFT-03: NFT inexistente mostra "NFT não encontrado" com link de volta', async ({ page }) => {
    await prepare(page)
    await page.goto('/nft/nao-existe')
    await expect(page.getByRole('heading', { level: 1, name: 'NFT não encontrado' })).toBeVisible()
    await expect(page.getByTestId('nft-detail-skeleton')).toHaveCount(0)
    await page.getByRole('link', { name: 'Voltar ao início' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('NFT-01: nome, preço, avaliações, coleção, atributos, contrato e abas', async ({ page }) => {
    await openDetail(page)
    await expect(page.getByText('#0042', { exact: true })).toBeVisible()
    await expect(page.getByText('Kurio Apes', { exact: true })).toBeVisible()
    await expect(page.getByText('Óculos', { exact: true })).toBeVisible()

    const detailsTab = page.getByRole('tab', { name: 'Detalhes do NFT' })
    const reviewsTab = page.getByRole('tab', { name: /Avaliações.*\(19\)/ })
    await expect(detailsTab).toHaveAttribute('aria-selected', 'true')
    const panel = page.getByRole('tabpanel')
    await expect(panel).toContainText('Contrato:')
    await expect(panel).toContainText('0x7A42...19E8 • Contrato inteligente ERC-721 verificado.')
    await expect(panel).toContainText('Direitos autorais do criador: 5% nas vendas secundárias')

    await reviewsTab.click()
    await expect(reviewsTab).toHaveAttribute('aria-selected', 'true')
    const reviews = page.getByRole('tabpanel').getByRole('list', { name: 'Avaliações' }).getByRole('listitem')
    await expect(reviews).toHaveCount(5)
    await page.getByRole('button', { name: /Ver mais avaliações/ }).click()
    await expect(reviews).toHaveCount(10)

    // Keyboard: arrows move between tabs (radix tabs semantics).
    await reviewsTab.focus()
    await page.keyboard.press('ArrowLeft', { delay: 50 })
    await expect(detailsTab).toHaveAttribute('aria-selected', 'true')
  })

  test('NFT-01: galeria navegável com miniaturas, teclado e zoom em diálogo', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Miniaturas e zoom existem só na composição desktop; o mobile é coberto pelo teste de swipe/dots.')
    await openDetail(page)
    const main = page.getByTestId('gallery-main-image')
    await expect(main).toHaveAttribute('alt', /imagem 1 de 4/)
    const third = page.getByRole('button', { name: 'Mostrar imagem 3 de 4' })
    await third.click()
    await expect(third).toHaveAttribute('aria-pressed', 'true')
    await expect(main).toHaveAttribute('alt', /imagem 3 de 4/)
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('button', { name: 'Mostrar imagem 4 de 4' })).toBeFocused()
    await expect(main).toHaveAttribute('alt', /imagem 4 de 4/)

    const zoom = page.getByRole('button', { name: 'Ampliar imagem' })
    await zoom.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Emerald Ape #042')
    await expect(dialog.getByRole('img')).toHaveAttribute('alt', /imagem 4 de 4/)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(zoom).toBeFocused()
  })

  test('NFT-01: galeria mobile com swipe (scroll-snap), dots e voltar', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Composição mobile (< 768 px).')
    await openDetail(page)
    const second = page.getByRole('button', { name: 'Mostrar imagem 2 de 4' })
    await second.click()
    await expect(second).toHaveAttribute('aria-current', 'true')
    const carousel = page.getByRole('region', { name: /Imagens de Emerald Ape #042/ })
    await expect.poll(() => carousel.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100)

    // Direct access has no history entry: "Voltar" falls back to the catalog.
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('NFT-04: troca de edição altera o preço e a esgotada fica desabilitada com motivo', async ({ page }) => {
    await openDetail(page)
    await expect(page.getByRole('radio', { name: '1/50' })).toBeChecked()
    await expect(price(page)).toHaveText(/1\.19 ETH/)

    const soldOut = edition(page, '1/1')
    await expect(soldOut).toBeDisabled()
    await expect(soldOut).toHaveAccessibleName('1/1 — esgotada')
    await expect(page.getByTestId('edition-sold-out-reason')).toHaveText('1/1 esgotada')

    await page.getByRole('radio', { name: '1/10' }).click()
    await expect(page.getByRole('radio', { name: '1/10' })).toBeChecked()
    await expect(price(page)).toHaveText(/2\.38 ETH/)
    await page.getByRole('radio', { name: 'ABERTA' }).click()
    await expect(price(page)).toHaveText(/0\.595 ETH/)
    // Radio-group keyboard semantics: the arrow moves and selects. Radix moves focus in a
    // timeout and only selects while the key is still down, so hold it like a real key press.
    await page.keyboard.press('ArrowLeft', { delay: 50 })
    await expect(page.getByRole('radio', { name: '1/50' })).toBeChecked()
    await expect(price(page)).toHaveText(/1\.19 ETH/)
  })

  test('NFT-05: quantidade de 1 até a disponibilidade, descontando o carrinho', async ({ page, isMobile }) => {
    await openDetail(page)
    await page.getByRole('radio', { name: '1/10' }).click()
    await expect(quantity(page)).toHaveText('1')
    await expect(minus(page)).toBeDisabled()

    for (let i = 0; i < 3; i++) await plus(page).click()
    await expect(quantity(page)).toHaveText('4')
    await expect(plus(page)).toBeDisabled()
    await plus(page).click({ force: true })
    await expect(quantity(page)).toHaveText('4')
    await expect(page.getByTestId('live-region-polite')).toContainText('Limite atingido')

    await minus(page).click()
    await expect(quantity(page)).toHaveText('3')
    await buyButton(page).click()
    await expect(notice(page)).toContainText('3 unidades da edição 1/10 adicionadas ao carrinho')
    const badge = isMobile ? page.getByTestId('mobile-cart-count') : page.getByTestId('cart-badge')
    await expect(badge).toHaveText('3')

    // 4 available − 3 in the cart = 1 selectable unit.
    await expect(quantity(page)).toHaveText('1')
    await expect(plus(page)).toBeDisabled()
    await expect(minus(page)).toBeDisabled()
  })

  test('NFT-06: comprar adiciona ao carrinho via API e informa de forma acessível', async ({ page, isMobile }) => {
    await openDetail(page)
    await buyButton(page).click()
    await expect(notice(page)).toContainText('1 unidade da edição 1/50 adicionada ao carrinho.')
    await expect(page.getByTestId('live-region-polite')).toContainText(
      'Emerald Ape #042: 1 unidade da edição 1/50 adicionada ao carrinho.',
    )
    const badge = isMobile ? page.getByTestId('mobile-cart-count') : page.getByTestId('cart-badge')
    await expect(badge).toHaveText('1')
    if (isMobile) await expect(page.getByRole('link', { name: 'Carrinho, 1 item' })).toBeVisible()

    await notice(page).getByRole('link', { name: 'Ver carrinho' }).click()
    await expect(page).toHaveURL(/\/cart$/)
  })

  test('NFT-06 CART-02: 409 de disponibilidade mostra a mensagem da API e reajusta o limite', async ({ page }) => {
    await openDetail(page)
    await page.getByRole('radio', { name: '1/10' }).click()
    await plus(page).click()
    await plus(page).click()
    await expect(quantity(page)).toHaveText('3')

    // The socket is down, so the page cannot learn about the new stock before buying.
    await waitForMocks(page)
    await page.evaluate(() => window.__kurioMocks!.realtime.dropAllConnections({ refuse: true }))
    await expect.poll(() => page.evaluate(() => window.__kurioMocks!.realtime.connectionCount())).toBe(0)
    await page.evaluate((id) => window.__kurioMocks!.nft.setAvailability('emerald-ape-042', id, 2), LIMITED_10)
    await expect(quantity(page)).toHaveText('3')

    await buyButton(page).click()
    await expect(notice(page)).toContainText('Só restam 2 unidade(s) da edição 1/10.')
    await expect(page.getByTestId('live-region-assertive')).toContainText('Só restam 2 unidade(s) da edição 1/10.')
    // The 409 reloads the detail: the selectable maximum follows the real stock.
    await expect(quantity(page)).toHaveText('2')
    await expect(plus(page)).toBeDisabled()
    await page.evaluate(() => window.__kurioMocks!.realtime.restoreConnections())
  })

  test('RT-02: preço muda em tempo real via socket, sem recarregar, e é anunciado', async ({ page }) => {
    await openDetail(page)
    await expect(price(page)).toHaveText(/1\.19 ETH/)
    await page.evaluate(() => {
      ;(window as unknown as { __noReload: boolean }).__noReload = true
    })
    await waitForSocket(page)
    await expect(async () => {
      await page.evaluate(() => window.__kurioMocks!.nft.setPrice('emerald-ape-042', '1.49'))
      await expect(price(page)).toHaveText(/1\.49 ETH/, { timeout: 1_500 })
    }).toPass({ timeout: 10_000 })
    await expect(page.getByTestId('live-region-polite')).toContainText('Preço atualizado para 1.49 ETH')
    await expect(page.getByTestId('price-updated-chip')).toBeVisible()
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true)
  })

  test('RT-02 NFT-04: edição selecionada esgota em tempo real e fica desabilitada com motivo', async ({ page }) => {
    await openDetail(page)
    await page.getByRole('radio', { name: '1/10' }).click()
    await waitForSocket(page)
    await expect(async () => {
      await page.evaluate((id) => window.__kurioMocks!.nft.setAvailability('emerald-ape-042', id, 0), LIMITED_10)
      await expect(edition(page, '1/10')).toBeDisabled({ timeout: 1_500 })
    }).toPass({ timeout: 10_000 })
    await expect(page.getByTestId('edition-sold-out-reason')).toHaveText('1/1, 1/10 esgotadas')
    await expect(notice(page)).toContainText('A edição 1/10 está esgotada. Escolha outra edição.')
    await expect(page.getByTestId('live-region-assertive')).toContainText('A edição 1/10 esgotou')
    await expect(buyButton(page)).toBeDisabled()
    await expect(quantity(page)).toHaveText('0')
  })

  test('RT-02 NFT-05: queda de disponibilidade em tempo real reduz a quantidade escolhida', async ({ page }) => {
    await openDetail(page)
    await page.getByRole('radio', { name: '1/10' }).click()
    for (let i = 0; i < 3; i++) await plus(page).click()
    await expect(quantity(page)).toHaveText('4')
    await waitForSocket(page)
    await expect(async () => {
      await page.evaluate((id) => window.__kurioMocks!.nft.setAvailability('emerald-ape-042', id, 2), LIMITED_10)
      await expect(quantity(page)).toHaveText('2', { timeout: 1_500 })
    }).toPass({ timeout: 10_000 })
    await expect(plus(page)).toBeDisabled()
    await expect(page.getByTestId('live-region-assertive')).toContainText('quantidade ajustada para 2')
  })

  test('NFT-01: "Mais desta coleção" leva a outro NFT e reinicia a seleção', async ({ page, isMobile }) => {
    await openDetail(page)
    await page.getByRole('radio', { name: 'ABERTA' }).click()
    const related = page.getByTestId('related-section')
    await related.scrollIntoViewIfNeeded()

    if (!isMobile) {
      // Desktop carousel: dots are real page buttons.
      const page2 = related.getByRole('button', { name: 'Página 2 de 3' })
      await page2.click()
      await expect(page2).toHaveAttribute('aria-current', 'true')
      await expect(related.getByRole('link', { name: /Golden Beat #207/ })).toBeInViewport()
      await expect(related.getByRole('link', { name: /Sage Nomad #009/ })).not.toBeInViewport()
      await related.getByRole('button', { name: 'Página 1 de 3' }).click()
    }

    await related.getByRole('link', { name: /Sage Nomad #009/ }).click()
    await expect(page).toHaveURL(/\/nft\/sage-nomad-009$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Sage Nomad #009' })).toBeVisible()
    await expect(page.getByRole('radio', { name: '1/50' })).toBeChecked()
    await expect(quantity(page)).toHaveText('1')
  })

  test('FAV-03: visitante que favorita vai ao login e volta ao NFT', async ({ page }) => {
    await openDetail(page)
    await page.getByRole('button', { name: /^Favoritar/ }).click()
    await expect(page).toHaveURL(/\/login\?/)
    expect(new URL(page.url()).searchParams.get('redirect')).toContain('/nft/emerald-ape-042')
  })

  test('GEN-05: skeleton com as dimensões do layout durante o carregamento (rede lenta)', async ({ page }) => {
    await prepare(page, { scenario: 'slow' })
    await page.goto(`/nft/${NFT}`)
    const skeleton = page.getByTestId('nft-detail-skeleton')
    await expect(skeleton).toBeVisible()
    await expect(skeleton).toHaveAttribute('aria-busy', 'true')
    await expect(title(page)).toBeVisible({ timeout: 15_000 })
    await expect(skeleton).toHaveCount(0)
  })

  test('GEN-05: sem shimmer com prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await prepare(page, { scenario: 'slow' })
    await page.goto(`/nft/${NFT}`)
    const block = page.getByTestId('nft-detail-skeleton').locator('.skeleton-shimmer').first()
    await expect(block).toBeVisible()
    const duration = await block.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration))
    expect(duration).toBeLessThan(0.01)
  })

  test('GEN-06: falha do detalhe mostra erro com "Tentar novamente"', async ({ page }) => {
    await prepare(page, { scenario: 'server-error' })
    await page.goto(`/nft/${NFT}`)
    const retry = page.getByRole('button', { name: 'Tentar novamente' })
    await expect(retry).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('alert')).toContainText('Não foi possível carregar este NFT')
    await setScenario(page, 'default')
    await retry.click()
    await expect(title(page)).toBeVisible()
  })

  test('GEN-04: sem overflow horizontal (390, 768 e 1440 px)', async ({ page, isMobile }) => {
    await openDetail(page)
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(await overflow()).toBeLessThanOrEqual(0)
    if (!isMobile) {
      await page.setViewportSize({ width: 768, height: 1024 })
      await expect(title(page)).toBeVisible()
      expect(await overflow()).toBeLessThanOrEqual(0)
    }
  })
})
