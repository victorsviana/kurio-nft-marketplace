import { expect, test } from '@playwright/test'

test.describe('Checkpoint 1 — fundação', () => {
  test('MOCK-01 RT-01: REST e Socket.IO passam pelo MSW no build otimizado', async ({ page }) => {
    await page.goto('/status')
    await expect(page.getByTestId('rest-status')).toHaveText('ok (mocks: true)')
    await expect(page.getByTestId('socket-status')).toHaveText('connected')
    await expect(page.getByTestId('socket-last-event')).toContainText('system.ready')
  })

  test('GEN-02: acesso direto a rota profunda', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1, name: 'Detalhes do NFT' })).toBeVisible()
  })

  test('GEN-01: rota inexistente mostra 404 com link para o início', async ({ page }) => {
    await page.goto('/rota/que/nao/existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao início' }).click()
    await expect(page).toHaveURL('/')
  })
})
