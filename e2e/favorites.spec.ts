import { expect, test, type Page } from '@playwright/test'
import { api } from './support/commerce.ts'
import { prepare, setScenario, signInViaApi, USERS, waitForMocks } from './support/mocks.ts'

/**
 * Favoritos (FAV-01..FAV-03). The detail page exposes "Favoritar" (desktop button) or
 * "Favoritar <nome>" (mobile hero); both carry `aria-pressed`. Failures are injected on the
 * simulated server (`failNext`), never in the app.
 */

const APE = 'emerald-ape-042'
const APE_NAME = 'Emerald Ape #042'
const NOMAD = 'violet-nomad-314'
const NOMAD_NAME = 'Violet Nomad #314'
/** Bruno's seed favorites: only Golden Beat #207 (Ana already has Emerald Ape). */
const SEEDED_NAME = 'Golden Beat #207'

const heart = (page: Page) => page.getByRole('button', { name: /^Favoritar/ }).first()
const polite = (page: Page) => page.getByTestId('live-region-polite')
const assertive = (page: Page) => page.getByTestId('live-region-assertive')

async function submitLogin(page: Page, { email, password }: { email: string; password: string }) {
  const form = page.getByRole('form', { name: 'Entrar' })
  await form.getByLabel('E-mail').fill(email)
  await form.getByLabel('Senha', { exact: true }).fill(password)
  await form.getByRole('button', { name: 'Entrar', exact: true }).click()
}

/** Detail of a NFT Bruno has not favorited, with his favorites already loaded. */
async function openDetailSignedIn(page: Page) {
  await prepare(page)
  await page.goto(`/nft/${APE}`)
  const favoritesLoaded = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/favorites' && r.ok())
  await signInViaApi(page, 'bruno')
  await favoritesLoaded
  await expect(page.getByRole('heading', { level: 1, name: APE_NAME })).toBeVisible()
}

test.describe('Favoritos', () => {
  test('FAV-03: visitante que tenta favoritar vai ao login e volta ao NFT', async ({ page }) => {
    await prepare(page)
    await page.goto(`/nft/${APE}`)
    await expect(page.getByRole('heading', { level: 1, name: APE_NAME })).toBeVisible()
    await heart(page).click()
    await expect(page).toHaveURL(`/login?redirect=%2Fnft%2F${APE}`)
    await submitLogin(page, USERS.ana)
    await expect(page).toHaveURL(`/nft/${APE}`)
    await expect(page.getByRole('heading', { level: 1, name: APE_NAME })).toBeVisible()
  })

  test('FAV-01: favorito persiste após refresh e após sair e entrar de novo', async ({ page, isMobile }) => {
    await openDetailSignedIn(page)
    await expect(heart(page)).toHaveAttribute('aria-pressed', 'false')
    await heart(page).click()
    await expect(heart(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(polite(page)).toHaveText(`${APE_NAME} adicionado aos favoritos.`)

    await page.reload()
    await expect(heart(page)).toHaveAttribute('aria-pressed', 'true')

    if (isMobile) {
      // The mobile detail frame has no header: end the session the way the app stores it.
      await page.evaluate(() => localStorage.removeItem('kurio.session'))
      await page.reload()
    } else {
      await page.getByRole('button', { name: `Conta de ${USERS.bruno.displayName}` }).click()
      await page.getByRole('menuitem', { name: 'Sair' }).click()
    }
    await expect(heart(page)).toHaveAttribute('aria-pressed', 'false')

    await signInViaApi(page, 'bruno')
    await expect(heart(page)).toHaveAttribute('aria-pressed', 'true')
  })

  test('FAV-02: falha ao favoritar reverte o coração e avisa', async ({ page }) => {
    await openDetailSignedIn(page)
    await expect(heart(page)).toHaveAttribute('aria-pressed', 'false')
    // Slow network so the optimistic state is observable before the failure arrives.
    await setScenario(page, 'slow')
    await page.evaluate(() => window.__kurioMocks!.failNext('PUT /favorites/*', { status: 500, code: 'INTERNAL_ERROR' }))

    await heart(page).click()
    await expect(heart(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(heart(page)).toHaveAttribute('aria-pressed', 'false', { timeout: 10_000 })
    await expect(assertive(page)).toContainText(`Não foi possível favoritar ${APE_NAME}`)
    await expect(page.getByText(`Não foi possível favoritar ${APE_NAME}`, { exact: false }).first()).toBeVisible()

    await setScenario(page, 'default')
    const favorites = await api<{ nftIds: string[] }>(page, 'GET', '/favorites')
    expect(favorites.body.nftIds).not.toContain(APE)
  })

  test('FAV-01 FAV-02: página de favoritos lista e remove na hora', async ({ page }) => {
    await prepare(page)
    await page.goto('/status')
    await waitForMocks(page)
    await signInViaApi(page, 'bruno')
    await api(page, 'PUT', `/favorites/${NOMAD}`)

    await page.goto('/favorites')
    await expect(page.getByRole('heading', { level: 1, name: /Favoritos/ })).toBeVisible()
    const cards = page.getByTestId('favorites-grid').getByTestId('nft-card')
    await expect(cards).toHaveCount(2)

    const nomadHeart = page.getByRole('button', { name: `Favoritar ${NOMAD_NAME}` })
    await expect(nomadHeart).toHaveAttribute('aria-pressed', 'true')
    await nomadHeart.click()
    await expect(cards).toHaveCount(1)
    await expect(cards).toContainText(SEEDED_NAME)
    await expect(polite(page)).toHaveText(`${NOMAD_NAME} removido dos favoritos.`)

    await page.reload()
    await expect(cards).toHaveCount(1)

    await page.getByRole('button', { name: `Favoritar ${SEEDED_NAME}` }).click()
    await expect(page.getByText('Você ainda não favoritou nenhum NFT')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Explorar o mercado' })).toBeVisible()
  })

  test('GEN-05: skeleton dos favoritos na rede lenta', async ({ page }) => {
    await prepare(page)
    await page.goto('/status')
    await signInViaApi(page, 'bruno')
    await setScenario(page, 'slow')
    // The scenario is persisted, so the next load is slow from the first request.
    await page.goto('/favorites')
    await expect(page.getByTestId('favorites-skeleton')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('favorites-grid').getByTestId('nft-card')).toHaveCount(1, { timeout: 15_000 })
    await expect(page.getByTestId('favorites-skeleton')).toHaveCount(0)
  })
})
