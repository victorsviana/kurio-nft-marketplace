import { expect, test, type Locator, type Page } from '@playwright/test'
import { prepare, setScenario, waitForMocks } from './support/mocks.ts'

/*
 * Catálogo (Início) — CAT-01..CAT-09, GEN-05, GEN-06, A11Y-02.
 * Runs on both projects: desktop (1440, filters in the sidebar, sort in the toolbar) and
 * mobile (390, search on top of the page, filters and sort in a Sheet).
 */

const FIRST_PAGE = ['Emerald Ape #042', 'Sage Nomad #009', 'Neon Vessel #552']

const width = (page: Page) => page.viewportSize()?.width ?? 1440
/** Below 1024 the filters live in a Sheet. */
const filtersInSheet = (page: Page) => width(page) < 1024
/** Below 768 the page follows the Mobile / Início frame (no header, sort inside the Sheet). */
const mobileLayout = (page: Page) => width(page) < 768

function results(page: Page) {
  return page.getByTestId('catalog-results')
}

/** Waits until the grid shows the response for the current URL (no placeholder, no fetch). */
async function waitForGrid(page: Page) {
  await expect(results(page)).toHaveAttribute('aria-busy', 'false', { timeout: 10_000 })
}

function cardNames(page: Page) {
  return page.getByTestId('catalog-grid').locator('h3')
}

async function firstNames(page: Page, count = 3) {
  return (await cardNames(page).allTextContents()).slice(0, count)
}

function urlParams(page: Page): Record<string, string> {
  return Object.fromEntries([...new URL(page.url()).searchParams.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

async function search(page: Page, term: string) {
  if (mobileLayout(page)) {
    const field = page.getByRole('searchbox', { name: 'Buscar NFTs' })
    await field.fill(term)
    await field.press('Enter')
  } else {
    await page.getByRole('button', { name: 'Buscar NFTs' }).click()
    const field = page.getByRole('dialog').getByRole('searchbox', { name: 'Termo de busca' })
    await field.fill(term)
    await field.press('Enter')
  }
}

/** Returns the container with the filter controls (sidebar or opened Sheet). */
async function openFilters(page: Page): Promise<Locator> {
  if (!filtersInSheet(page)) return page.getByRole('complementary', { name: 'Filtros do catálogo' })
  await page.getByRole('button', { name: /^Filtros/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Filtros' })
  await expect(sheet).toBeVisible()
  return sheet
}

async function closeFilters(page: Page) {
  if (!filtersInSheet(page)) return
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Filtros' })).toBeHidden()
}

async function toggleFilter(scope: Locator, name: string) {
  await scope.getByRole('checkbox', { name: new RegExp(`^${name}`) }).click()
}

async function chooseSort(page: Page, label: string) {
  if (mobileLayout(page)) {
    const sheet = await openFilters(page)
    await sheet.getByRole('radio', { name: label }).click()
    await closeFilters(page)
  } else {
    await page.getByRole('combobox', { name: /Ordenar por/ }).click()
    await page.getByRole('option', { name: label }).click()
  }
}

test.describe('Catálogo (Início)', () => {
  test.beforeEach(async ({ page }) => {
    await prepare(page)
  })

  test('CAT-01 CAT-09: hero, NFT em destaque e grade paginada vindos da API; card leva ao detalhe', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('img', { name: 'Arte do NFT Emerald Ape #042' }).first()).toBeVisible()
    await waitForGrid(page)
    expect(await firstNames(page)).toEqual(FIRST_PAGE)
    await expect(cardNames(page)).toHaveCount(9)
    await expect(page.getByTestId('catalog-grid')).toContainText('1.99 ETH')
    await expect(page.getByTestId('catalog-grid')).toContainText('2.29 ETH')
    await expect(page.getByRole('navigation', { name: 'Paginação do catálogo' }).getByRole('link', { name: 'Página 1' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    const spotlight = page.getByRole('heading', { name: 'NFT EM DESTAQUE' })
    await spotlight.scrollIntoViewIfNeeded()
    await expect(spotlight).toBeVisible()
    await expect(page.locator('a[href="/nft/sage-nomad-009"]').first()).toBeAttached()

    await page.getByRole('link', { name: 'Emerald Ape #042' }).click()
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042$/)
  })

  test('CAT-02 CAT-03 CAT-04 CAT-05: busca, filtros combinados, ordenação, paginação e voltar/avançar', async ({ page }) => {
    await page.goto('/')
    await waitForGrid(page)

    // pagination writes ?page=
    await page.getByRole('link', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/[?&]page=2/)
    await waitForGrid(page)
    expect(await firstNames(page, 1)).not.toEqual([FIRST_PAGE[0]])

    // search becomes ?q= and goes back to page 1 (CAT-05)
    await search(page, 'golden')
    await expect(page).toHaveURL(/[?&]q=golden/)
    expect(new URL(page.url()).searchParams.has('page')).toBe(false)
    await waitForGrid(page)
    expect(await firstNames(page, 1)).toEqual(['Golden Beat #207'])

    // survives refresh (CAT-02)
    await page.reload()
    await waitForGrid(page)
    expect(urlParams(page)).toEqual({ q: 'golden' })
    await expect(page.getByRole('button', { name: 'Remover filtro Busca: “golden”' })).toBeVisible()
    expect(await firstNames(page, 1)).toEqual(['Golden Beat #207'])

    // combined filters (category + network) with counts from the API
    let filters = await openFilters(page)
    await expect(filters.getByRole('checkbox', { name: /^Música/ })).not.toBeChecked()
    await toggleFilter(filters, 'Música')
    await expect(page).toHaveURL(/[?&]category=music/)
    await toggleFilter(filters, 'Ethereum')
    await expect(page).toHaveURL(/[?&]network=ethereum/)
    await expect(filters.getByRole('checkbox', { name: /^Música/ })).toBeChecked()
    await closeFilters(page)
    await waitForGrid(page)
    expect(urlParams(page)).toEqual({ category: 'music', network: 'ethereum', q: 'golden' })
    expect(await firstNames(page, 1)).toEqual(['Golden Beat #207'])

    // sort is reflected in the URL and in the order (CAT-04)
    await chooseSort(page, 'Maior preço')
    await expect(page).toHaveURL(/[?&]sort=price-desc/)
    await waitForGrid(page)
    const prices = await page.getByTestId('catalog-grid').locator('p > span:not(.sr-only)').filter({ hasText: /ETH$/ }).allTextContents()
    const numbers = prices.map((p) => Number.parseFloat(p))
    expect(numbers).toEqual([...numbers].sort((a, b) => b - a))

    // history restores every step (CAT-02)
    await page.goBack()
    await expect(page).not.toHaveURL(/sort=/)
    expect(urlParams(page)).toEqual({ category: 'music', network: 'ethereum', q: 'golden' })
    await page.goBack()
    await expect(page).not.toHaveURL(/network=/)
    expect(urlParams(page)).toEqual({ category: 'music', q: 'golden' })
    await waitForGrid(page)
    filters = await openFilters(page)
    await expect(filters.getByRole('checkbox', { name: /^Ethereum/ })).not.toBeChecked()
    await expect(filters.getByRole('checkbox', { name: /^Música/ })).toBeChecked()
    await closeFilters(page)
    await page.goForward()
    await expect(page).toHaveURL(/[?&]network=ethereum/)
    await waitForGrid(page)
    expect(await firstNames(page, 1)).toEqual(['Golden Beat #207'])
  })

  test('CAT-03: faixa de preço pelo teclado + "Aplicar" grava minPrice e volta para a página 1', async ({ page }) => {
    await page.goto('/?page=3')
    await waitForGrid(page)
    const filters = await openFilters(page)
    await expect(filters.getByTestId('price-range-label')).toHaveText('Preço: 0,02 - 12,30 ETH')
    const minThumb = filters.getByRole('slider', { name: 'Preço mínimo' })
    await minThumb.focus()
    for (let i = 0; i < 10; i++) await page.keyboard.press('Shift+ArrowRight') // 10 × 0,10
    await page.keyboard.press('ArrowLeft') // − 0,01
    await page.keyboard.press('ArrowLeft')
    await expect(filters.getByTestId('price-range-label')).toHaveText('Preço: 1,00 - 12,30 ETH')
    await expect(minThumb).toHaveAttribute('aria-valuetext', '1,00 ETH')
    // the draft is not applied until "Aplicar"
    expect(urlParams(page)).toEqual({ page: '3' })
    await filters.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page).toHaveURL(/[?&]minPrice=1(&|$)/)
    expect(urlParams(page)).toEqual({ minPrice: '1' })
    await closeFilters(page)
    await waitForGrid(page)
    const prices = await page.getByTestId('catalog-grid').locator('p > span:not(.sr-only)').filter({ hasText: /ETH$/ }).allTextContents()
    expect(prices.length).toBeGreaterThan(0)
    for (const price of prices) expect(Number.parseFloat(price)).toBeGreaterThanOrEqual(1)

    // the bound survives a refresh and is shown as a removable chip
    await page.reload()
    await waitForGrid(page)
    expect(urlParams(page)).toEqual({ minPrice: '1' })
    await page.getByRole('button', { name: 'Remover filtro A partir de 1,00 ETH' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('CAT-06: a requisição leva exatamente os parâmetros da URL', async ({ page }) => {
    const isCatalogList = (url: string) => new URL(url).pathname === '/api/nfts'
    const query =
      '/?q=ape&tab=trending&category=digital-art,music&network=ethereum,polygon&minPrice=0.5&maxPrice=5&sort=price-asc&page=2'
    const firstRequest = page.waitForRequest((r) => isCatalogList(r.url()))
    await page.goto(query)
    const request = await firstRequest
    const sorted = (params: URLSearchParams) =>
      Object.fromEntries([...params.entries()].sort(([a], [b]) => a.localeCompare(b)))
    expect(sorted(new URL(request.url()).searchParams)).toEqual(urlParams(page))
    expect(urlParams(page)).toEqual({
      category: 'digital-art,music',
      maxPrice: '5',
      minPrice: '0.5',
      network: 'ethereum,polygon',
      page: '2',
      q: 'ape',
      sort: 'price-asc',
      tab: 'trending',
    })

    // after a UI change the next request mirrors the new URL (page dropped, tab changed)
    await waitForMocks(page)
    const nextRequest = page.waitForRequest((r) => isCatalogList(r.url()) && new URL(r.url()).searchParams.get('tab') === 'new')
    await page.getByRole('tab', { name: 'Novos lançamentos' }).click()
    const next = await nextRequest
    await expect(page).toHaveURL(/[?&]tab=new/)
    expect(sorted(new URL(next.url()).searchParams)).toEqual(urlParams(page))
    expect(new URL(next.url()).searchParams.has('page')).toBe(false)
  })

  test('CAT-07: resultado vazio mostra mensagem e "Limpar filtros" restaura o catálogo', async ({ page }) => {
    await page.goto('/?q=zzz-nada-encontrado&network=solana')
    await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).first().click()
    await expect(page).toHaveURL(/\/$/)
    await waitForGrid(page)
    expect(await firstNames(page)).toEqual(FIRST_PAGE)
  })

  test('CAT-07: catálogo vazio (cenário "empty") não oferece filtros para limpar', async ({ page }) => {
    await prepare(page, { scenario: 'empty' })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Limpar filtros' })).toHaveCount(0)
  })

  test('CAT-07 GEN-06: falha 503 mostra erro com "Tentar novamente" e a nova tentativa recupera', async ({ page }) => {
    await page.goto('/')
    await waitForGrid(page)
    await waitForMocks(page)
    // queries retry transient errors twice, so the request must fail 3 times to reach the UI
    await page.evaluate(() =>
      window.__kurioMocks!.failNext('GET /nfts', { status: 503, code: 'SERVICE_UNAVAILABLE', times: 3 }),
    )
    await page.getByRole('tab', { name: 'Em alta' }).click()
    await expect(page).toHaveURL(/[?&]tab=trending/)
    const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o catálogo' })
    await expect(alert).toBeVisible({ timeout: 15_000 })
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await waitForGrid(page)
    await expect(alert).toBeHidden()
    await expect(cardNames(page).first()).toBeVisible()
  })

  test('CAT-08: resposta antiga e lenta não sobrescreve a busca mais recente', async ({ page }) => {
    await page.goto('/')
    await waitForGrid(page)
    await waitForMocks(page)
    // expectations come from the API before switching scenario (the scenario counts requests)
    const expected = await page.evaluate(async () => {
      const names = async (p: number) =>
        ((await (await fetch(`/api/nfts?page=${p}`)).json()) as { items: { name: string }[] }).items.map((i) => i.name)
      return { page2: await names(2), page3: await names(3) }
    })
    expect(expected.page3.slice(0, 3)).not.toEqual(expected.page2.slice(0, 3))

    // odd catalog requests take 1.6 s, even ones 250 ms
    await setScenario(page, 'out-of-order')
    const pagination = page.getByRole('navigation', { name: 'Paginação do catálogo' })
    await pagination.getByRole('link', { name: 'Página 2' }).click() // request 1 — slow
    await expect(page).toHaveURL(/[?&]page=2/)
    await pagination.getByRole('link', { name: 'Página 3' }).click() // request 2 — fast
    await expect(page).toHaveURL(/[?&]page=3/)
    await waitForGrid(page)
    expect(await firstNames(page)).toEqual(expected.page3.slice(0, 3))

    // after the slow response would have landed, the grid still shows the latest request
    await page.waitForTimeout(1_800)
    await expect(page).toHaveURL(/[?&]page=3/)
    await expect(results(page)).toHaveAttribute('aria-busy', 'false')
    expect(await firstNames(page)).toEqual(expected.page3.slice(0, 3))
    await expect(pagination.getByRole('link', { name: 'Página 3' })).toHaveAttribute('aria-current', 'page')
  })

  test('GEN-05 GEN-06: skeleton com as dimensões do card na rede lenta e atualização em segundo plano', async ({ page }) => {
    await prepare(page, { scenario: 'slow' })
    await page.goto('/')
    const skeleton = page.getByTestId('catalog-skeleton')
    await expect(skeleton).toBeVisible()
    const skeletonBox = await skeleton.locator('li').first().boundingBox()

    await waitForGrid(page)
    await expect(skeleton).toBeHidden()
    const cardBox = await page.getByTestId('catalog-grid').locator('li').first().boundingBox()
    expect(skeletonBox && cardBox).toBeTruthy()
    expect(Math.abs(skeletonBox!.width - cardBox!.width)).toBeLessThanOrEqual(1)
    expect(Math.abs(skeletonBox!.height - cardBox!.height)).toBeLessThanOrEqual(4)

    // background update: previous cards stay visible, dimmed and marked busy
    await page.getByRole('tab', { name: 'Em alta' }).click()
    await expect(results(page)).toHaveAttribute('aria-busy', 'true')
    await expect(page.getByTestId('catalog-updating')).toBeVisible()
    await expect(cardNames(page).first()).toHaveText(FIRST_PAGE[0]!)
    await waitForGrid(page)
    await expect(page.getByTestId('live-region-polite')).toContainText(/NFTs? encontrados?/)
  })

  test('A11Y-02 CAT-03: drawer de filtros prende o foco, fecha com Esc e devolve o foco', async ({ page }) => {
    if (!filtersInSheet(page)) await page.setViewportSize({ width: 900, height: 900 })
    await page.goto('/')
    await waitForGrid(page)
    const trigger = page.getByRole('button', { name: /^Filtros/ })
    await trigger.click()
    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await expect(sheet).toBeVisible()
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab')
      expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }
    // keyboard toggles a facet checkbox
    const music = sheet.getByRole('checkbox', { name: /^Música/ })
    await music.focus()
    await page.keyboard.press('Space')
    await expect(music).toBeChecked()
    await expect(page).toHaveURL(/[?&]category=music/)
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(page.getByRole('button', { name: /^Filtros, 1 ativo/ })).toBeFocused()
  })
})
