import { expect, test } from '@playwright/test'
import { prepare, waitForMocks } from './support/mocks.ts'

/**
 * Simulated backend guarantees (MOCK-02, MOCK-03, MOCK-05, MOCK-06). These tests talk to the
 * mock layer only through its REST API and its control surface, like a real client would.
 */
test.describe('Simulação', () => {
  test.beforeEach(async ({ page }) => {
    await prepare(page)
    await page.goto('/status')
    await waitForMocks(page)
  })

  test('MOCK-05: fixtures determinísticas com variedade para filtros e paginação', async ({ page }) => {
    const list = await page.evaluate(async () => (await fetch('/api/nfts')).json())
    expect(list.total).toBe(72)
    expect(list.totalPages).toBe(8)
    expect(list.items.slice(0, 3).map((i: { name: string }) => i.name)).toEqual([
      'Emerald Ape #042',
      'Sage Nomad #009',
      'Neon Vessel #552',
    ])
    expect(list.facets.priceRange).toEqual({ min: '0.02', max: '12.3' })
    for (const facet of [...list.facets.categories, ...list.facets.networks]) expect(facet.count).toBeGreaterThan(0)
  })

  test('MOCK-06: mudança no banco reflete no REST (detalhe e listagem) com a nova versão', async ({ page }) => {
    // The matching nft.updated event reaching the UI through socket.io-client is covered by RT-02 (nft-detail.spec.ts).
    const before = await page.evaluate(async () => (await fetch('/api/nfts/emerald-ape-042')).json())
    await page.evaluate(() => window.__kurioMocks!.nft.setPrice('emerald-ape-042', '1.49'))
    const after = await page.evaluate(async () => (await fetch('/api/nfts/emerald-ape-042')).json())
    expect(after.price).toBe('1.49')
    expect(after.version).toBe(before.version + 1)
    const list = await page.evaluate(async () => (await fetch('/api/nfts')).json())
    expect(list.items[0]).toMatchObject({ id: 'emerald-ape-042', price: '1.49', version: after.version })
  })

  test('MOCK-02 MOCK-03: estado persiste após refresh e o reset restaura o cenário conhecido', async ({ page }) => {
    await page.evaluate(() => {
      window.__kurioMocks!.nft.sellOut('emerald-ape-042')
      window.__kurioMocks!.setScenario('slow')
    })
    await page.reload()
    await waitForMocks(page)
    const persisted = await page.evaluate(async () => ({
      nft: await (await fetch('/api/nfts/emerald-ape-042')).json(),
      scenario: window.__kurioMocks!.getScenario(),
    }))
    expect(persisted.scenario).toBe('slow')
    expect(persisted.nft.editions.find((e: { kind: string }) => e.kind === 'limited-50').available).toBe(0)

    await page.evaluate(() => window.__kurioMocks!.reset())
    const restored = await page.evaluate(async () => ({
      nft: await (await fetch('/api/nfts/emerald-ape-042')).json(),
      scenario: window.__kurioMocks!.getScenario(),
    }))
    expect(restored.scenario).toBe('default')
    expect(restored.nft.version).toBe(1)
    expect(restored.nft.editions.find((e: { kind: string }) => e.kind === 'limited-50').available).toBe(12)
  })

  test('MOCK-04: falha pontual por rota e modo offline são reproduzíveis', async ({ page }) => {
    const statuses = await page.evaluate(async () => {
      window.__kurioMocks!.failNext('GET /nfts/*', { status: 500, code: 'INTERNAL_ERROR' })
      const first = (await fetch('/api/nfts/emerald-ape-042')).status
      const second = (await fetch('/api/nfts/emerald-ape-042')).status
      window.__kurioMocks!.setScenario('offline')
      const offline = await fetch('/api/nfts').then(
        (r) => r.status,
        () => 'network-error',
      )
      window.__kurioMocks!.setScenario('default')
      return { first, second, offline }
    })
    expect(statuses).toEqual({ first: 500, second: 200, offline: 'network-error' })
  })
})
