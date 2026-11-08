import { expect, test } from '@playwright/test'

// The binding does not ping; the mock hub does. Without pings socket.io-client drops the
// connection after pingInterval + pingTimeout (30s). This guards that behaviour (RT-01).
test('RT-01: conexão simulada permanece ativa além do ping timeout (30s)', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/status')
  await expect(page.getByTestId('socket-status')).toHaveText('connected')
  const firstEvent = await page.getByTestId('socket-last-event').textContent()
  await page.waitForTimeout(36_000)
  await expect(page.getByTestId('socket-status')).toHaveText('connected')
  // A reconnection would emit a new system.ready with a different timestamp.
  await expect(page.getByTestId('socket-last-event')).toHaveText(firstEvent ?? '')
})
