import { expect, test, type Locator, type Page } from '@playwright/test'
import { prepare, setScenario, USERS, waitForMocks } from './support/mocks.ts'

/**
 * §9 scenario 3 — account and session lifecycle: sign up, login, `?redirect=`, refresh,
 * expiry, logout, user switch and private routes. Desktop renders the forms inside a modal,
 * mobile as a full page; both expose the same named forms ("Entrar" / "Criar conta").
 */

const EXPIRED_MESSAGE = 'Sua sessão expirou. Entre novamente para continuar.'
const NEW_PASSWORD = 'Segredo2026'
const PRIVATE_ROUTES = ['/checkout', '/account/profile', '/account/wallets', '/favorites', '/orders/ord-demo-001']

type Credentials = { email: string; password: string }

const loginForm = (page: Page) => page.getByRole('form', { name: 'Entrar' })
const signupForm = (page: Page) => page.getByRole('form', { name: 'Criar conta' })
/** Desktop modal CTA is "Criar conta"; the mobile frame says "Criar perfil". */
const signupSubmit = (form: Locator) => form.getByRole('button', { name: /^Criar (conta|perfil)$/ })
const accountButton = (page: Page, name: string) => page.getByRole('button', { name: `Conta de ${name}` })
const heading = (page: Page, name: string) => page.getByRole('heading', { level: 1, name })

async function open(page: Page, url: string) {
  await prepare(page)
  await page.goto(url)
  await waitForMocks(page)
}

async function submitLogin(page: Page, { email, password }: Credentials) {
  const form = loginForm(page)
  await form.getByLabel('E-mail').fill(email)
  await form.getByLabel('Senha', { exact: true }).fill(password)
  await form.getByRole('button', { name: 'Entrar', exact: true }).click()
}

async function submitSignup(page: Page, data: { username: string; email: string; password: string; confirm?: string }) {
  const form = signupForm(page)
  await form.getByLabel('Nome de usuário').fill(data.username)
  await form.getByLabel('E-mail').fill(data.email)
  await form.getByLabel('Senha', { exact: true }).fill(data.password)
  await form.getByLabel('Confirmar senha').fill(data.confirm ?? data.password)
  await signupSubmit(form).click()
}

/** A11Y-03: invalid state + message linked through aria-describedby and visible. */
async function expectFieldError(field: Locator, message: string) {
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await expect(field).toHaveAccessibleDescription(new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  const errorId = (await field.getAttribute('aria-describedby'))?.split(' ')[0]
  expect(errorId).toBeTruthy()
  await expect(field.page().locator(`[id="${errorId}"]`)).toHaveText(message)
}

const readSession = (page: Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem('kurio.session')
    return raw ? (JSON.parse(raw) as { token: string; userId: string; expiresAt: string }) : null
  })

async function logoutFromHeader(page: Page, displayName: string) {
  await accountButton(page, displayName).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
}

/** Back to the login screen with client-side navigation only (no reload). */
async function goToLoginWithoutReload(page: Page, isMobile: boolean) {
  if (isMobile) {
    // Home has no mobile header; the tab bar "Perfil" is private, so the guard sends us to login.
    await page.getByRole('navigation', { name: 'Navegação inferior' }).getByRole('link', { name: 'Perfil' }).click()
    await expect(page).toHaveURL('/login?redirect=%2Faccount%2Fprofile')
  } else {
    await page.getByRole('banner').getByRole('link', { name: 'Entrar' }).click()
    await expect(page).toHaveURL('/login?redirect=%2F')
  }
}

test.describe('Cenário 3 — conta e sessão', () => {
  test.describe('Cadastro', () => {
    test('AUTH-01 A11Y-03: validação no cliente com mensagens ligadas aos campos', async ({ page }) => {
      await open(page, '/signup')
      const form = signupForm(page)
      const username = form.getByLabel('Nome de usuário')
      const email = form.getByLabel('E-mail')
      const password = form.getByLabel('Senha', { exact: true })
      const confirm = form.getByLabel('Confirmar senha')

      await signupSubmit(form).click()
      await expect(username).toBeFocused()
      await expectFieldError(username, 'Informe um nome de usuário')
      await expectFieldError(email, 'Informe seu e-mail')
      await expectFieldError(password, 'Informe uma senha')
      await expectFieldError(confirm, 'Confirme sua senha')

      await username.fill('Ana Maria')
      await email.fill('ana@')
      await password.fill('abcdefgh')
      await confirm.fill('abcdefgx')
      await signupSubmit(form).click()
      await expect(username).toBeFocused()
      await expectFieldError(username, 'Use apenas letras minúsculas, números, ponto ou _')
      await expectFieldError(email, 'Informe um e-mail válido')
      await expectFieldError(password, 'A senha precisa ter pelo menos um número')
      await expectFieldError(confirm, 'As senhas não coincidem')

      // Fixing a field clears its error while typing; nothing was sent.
      await username.fill('ana.maria')
      await expect(username).not.toHaveAttribute('aria-invalid', 'true')
      await expect(page).toHaveURL('/signup')
      expect(await readSession(page)).toBeNull()
    })

    test('AUTH-01: e-mail já cadastrado (409) aparece no campo de e-mail', async ({ page }) => {
      await open(page, '/signup')
      await submitSignup(page, { username: 'carla.mendes', email: USERS.ana.email, password: NEW_PASSWORD })
      const email = signupForm(page).getByLabel('E-mail')
      await expectFieldError(email, 'Este e-mail já está cadastrado.')
      await expect(email).toBeFocused()
      await expect(signupForm(page).getByLabel('Nome de usuário')).not.toHaveAttribute('aria-invalid', 'true')
      await expect(page).toHaveURL('/signup')
      expect(await readSession(page)).toBeNull()
    })

    test('AUTH-01: nome de usuário em uso (409) aparece no campo de usuário', async ({ page }) => {
      await open(page, '/signup')
      await submitSignup(page, { username: 'ana.ribeiro', email: 'carla@kurio.dev', password: NEW_PASSWORD })
      const username = signupForm(page).getByLabel('Nome de usuário')
      await expectFieldError(username, 'Este nome de usuário já está em uso.')
      await expect(username).toBeFocused()
      await expect(signupForm(page).getByLabel('E-mail')).not.toHaveAttribute('aria-invalid', 'true')
    })

    test('AUTH-01: cadastro com dados novos entra na conta e volta ao redirect', async ({ page }) => {
      await open(page, '/signup?redirect=%2Faccount%2Fprofile')
      await submitSignup(page, { username: 'carla.mendes', email: 'Carla@Kurio.dev ', password: NEW_PASSWORD })

      await expect(page).toHaveURL('/account/profile')
      await expect(heading(page, 'Perfil do colecionador')).toBeVisible()
      await expect(accountButton(page, 'carla.mendes')).toBeVisible()
      await expect(page.getByText('Conta criada')).toBeVisible()

      const session = await readSession(page)
      expect(session?.userId).toMatch(/^user-/)
      // The password never reaches client storage (constitution §3).
      const leaked = await page.evaluate(
        (pw) => Object.keys(localStorage).filter((key) => (localStorage.getItem(key) ?? '').includes(pw)),
        NEW_PASSWORD,
      )
      expect(leaked).toEqual([])
    })

    test('AUTH-01: alternar entre Entrar e Criar conta preserva o redirect', async ({ page, isMobile }) => {
      await open(page, '/login?redirect=%2Fcheckout')
      await page.getByRole('link', { name: isMobile ? 'Novo na Kurio? Crie uma conta' : 'Criar conta' }).click()
      await expect(page).toHaveURL('/signup?redirect=%2Fcheckout')
      await expect(signupForm(page)).toBeVisible()
      await page.getByRole('link', { name: isMobile ? 'Já tem uma conta? Entre' : 'Entrar', exact: true }).click()
      await expect(page).toHaveURL('/login?redirect=%2Fcheckout')
      await submitLogin(page, USERS.ana)
      await expect(heading(page, 'Pagamento')).toBeVisible()
    })
  })

  test.describe('Login', () => {
    test('AUTH-02 A11Y-03: validação no cliente foca o primeiro campo inválido', async ({ page }) => {
      await open(page, '/login')
      const form = loginForm(page)
      await form.getByRole('button', { name: 'Entrar', exact: true }).click()
      const email = form.getByLabel('E-mail')
      await expect(email).toBeFocused()
      await expectFieldError(email, 'Informe seu e-mail')
      await expectFieldError(form.getByLabel('Senha', { exact: true }), 'Informe sua senha')

      await email.fill('ana@kurio')
      await form.getByRole('button', { name: 'Entrar', exact: true }).click()
      await expectFieldError(email, 'Informe um e-mail válido')
    })

    test('AUTH-02: credenciais inválidas mostram alerta no formulário', async ({ page }) => {
      await open(page, '/login')
      await submitLogin(page, { email: USERS.ana.email, password: 'senhaerrada1' })
      const alert = loginForm(page).getByRole('alert')
      await expect(alert).toHaveText('E-mail ou senha incorretos. Confira os dados e tente novamente.')
      await expect(alert).toBeFocused()
      await expect(page).toHaveURL('/login')
      expect(await readSession(page)).toBeNull()
    })

    test('AUTH-02 AUTH-06: rota privada leva ao login e volta para ela depois de entrar', async ({ page }) => {
      await open(page, '/account/profile')
      await expect(page).toHaveURL('/login?redirect=%2Faccount%2Fprofile')
      await submitLogin(page, USERS.ana)
      await expect(page).toHaveURL('/account/profile')
      await expect(heading(page, 'Perfil do colecionador')).toBeVisible()
      await expect(accountButton(page, 'Ana Ribeiro')).toBeVisible()
      // A11Y-04: the login is announced in the polite live region.
      await expect(page.getByTestId('live-region-polite')).toHaveText('Boas-vindas, Ana! Você entrou na sua conta.')
    })

    test('CHK-01 AUTH-02: /checkout sem sessão vai ao login e retorna ao checkout', async ({ page }) => {
      await open(page, '/checkout')
      await expect(page).toHaveURL('/login?redirect=%2Fcheckout')
      await submitLogin(page, USERS.bruno)
      await expect(page).toHaveURL('/checkout')
      await expect(heading(page, 'Pagamento')).toBeVisible()
    })

    test('AUTH-02: "Entrar" do header volta à página de origem', async ({ page, isMobile }) => {
      // The mobile cart follows its frame (own top bar, no global header): use /status there.
      const origin = isMobile ? '/status' : '/cart'
      await open(page, origin)
      await page.getByRole('banner').getByRole('link', { name: 'Entrar' }).click()
      await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent(origin)}`)
      await submitLogin(page, USERS.ana)
      await expect(page).toHaveURL(origin)
      await expect(accountButton(page, 'Ana Ribeiro')).toBeVisible()
    })

    test('AUTH-02: redirect externo é ignorado (sem open redirect)', async ({ page, baseURL }) => {
      await open(page, '/login?redirect=https%3A%2F%2Fevil.example%2Fphish')
      await submitLogin(page, USERS.ana)
      await expect(page).toHaveURL('/')
      expect(new URL(page.url()).origin).toBe(new URL(baseURL ?? page.url()).origin)
    })

    test('AUTH-02: botão fica desabilitado enquanto a API responde', async ({ page }) => {
      await open(page, '/login?redirect=%2Faccount%2Fprofile')
      await setScenario(page, 'slow')
      await submitLogin(page, USERS.ana)
      await expect(loginForm(page).getByRole('button', { name: 'Entrando…' })).toBeDisabled()
      await expect(page).toHaveURL('/account/profile', { timeout: 10_000 })
    })

    test('AUTH-02: falha de rede mostra alerta e permite tentar de novo', async ({ page }) => {
      await open(page, '/login?redirect=%2Faccount%2Fprofile')
      await setScenario(page, 'offline')
      await submitLogin(page, USERS.ana)
      const alert = loginForm(page).getByRole('alert')
      await expect(alert).toHaveText('Sem conexão com o servidor. Verifique sua internet e tente novamente.')
      expect(await readSession(page)).toBeNull()

      await setScenario(page, 'default')
      await loginForm(page).getByRole('button', { name: 'Entrar', exact: true }).click()
      await expect(page).toHaveURL('/account/profile')
    })

    test('GEN-03: "Esqueceu a senha?" e login social avisam "em breve" sem simular sucesso', async ({ page, isMobile }) => {
      await open(page, '/login')
      await loginForm(page).getByRole('button', { name: 'Esqueceu a senha?' }).click()
      await expect(page.getByText('Recuperação de senha: em breve', { exact: true })).toBeVisible()
      if (!isMobile) {
        // The modal hides the page's live regions from assistive tech, so it announces on its own.
        await expect(page.getByRole('dialog').getByRole('status')).toHaveText(/Recuperação de senha: em breve/)
      }
      await page.getByRole('button', { name: 'Continuar com Google' }).click()
      await expect(page.getByText('Entrar com Google: em breve', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Continuar com Facebook' }).click()
      await expect(page.getByText('Entrar com Facebook: em breve', { exact: true })).toBeVisible()
      await expect(page).toHaveURL('/login')
      expect(await readSession(page)).toBeNull()
    })
  })

  test.describe('Sessão', () => {
    test('AUTH-03: sessão é recuperada via GET /auth/session após o refresh', async ({ page }) => {
      await open(page, '/login?redirect=%2Faccount%2Fprofile')
      await submitLogin(page, USERS.ana)
      await expect(accountButton(page, 'Ana Ribeiro')).toBeVisible()

      const sessionRequest = page.waitForRequest((request) => request.url().endsWith('/api/auth/session'))
      await page.reload()
      await sessionRequest
      await expect(page).toHaveURL('/account/profile')
      await expect(heading(page, 'Perfil do colecionador')).toBeVisible()
      await expect(accountButton(page, 'Ana Ribeiro')).toBeVisible()
      await expect(page.getByRole('banner').getByRole('link', { name: 'Entrar' })).toHaveCount(0)

      // Signed in, /login just forwards to the requested page.
      await page.goto('/login?redirect=%2Faccount%2Fwallets')
      await expect(page).toHaveURL('/account/wallets')
      await expect(heading(page, 'Carteiras')).toBeVisible()
    })

    /**
     * Signs in, expires every session on the server and waits past the guard's 2 s dedupe
     * window. The pointer is parked off any link first (public links still preload on intent).
     */
    async function signInAndExpire(page: Page) {
      await open(page, '/login?redirect=%2Faccount%2Fprofile')
      await submitLogin(page, USERS.ana)
      await expect(heading(page, 'Perfil do colecionador')).toBeVisible()
      await page.mouse.move(1, 1)
      // Let post-login requests (e.g. the cart refetch under the new owner) settle first; a
      // request still in flight would detect the expiry in the background instead.
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
      await page.evaluate(() => window.__kurioMocks!.expireSessions())
      // the guard deduplicates session checks for 2s within one navigation
      await page.waitForTimeout(2_500)
    }

    async function expectExpiredBanner(page: Page, isMobile: boolean) {
      const scope = isMobile ? page.getByRole('main') : page.getByRole('dialog', { name: 'Entrar' })
      await expect(scope.getByRole('status').filter({ hasText: EXPIRED_MESSAGE })).toBeVisible()
      if (!isMobile) await expect(scope).toHaveAccessibleDescription(new RegExp(EXPIRED_MESSAGE))
      expect(await readSession(page)).toBeNull()
    }

    test('AUTH-04: expiração detectada em segundo plano numa tela privada leva ao login com o contexto atual', async ({ page, isMobile }) => {
      test.setTimeout(60_000)
      await signInAndExpire(page)

      // Background detection: the simulated server drops the socket; on reconnection the app
      // reconciles active queries with REST (RT-06), the cart request carries the expired token
      // and gets 401 SESSION_EXPIRED while the user is still on /account/profile.
      await page.evaluate(() => window.__kurioMocks!.realtime.dropAllConnections())
      await expect(page).toHaveURL('/login?redirect=%2Faccount%2Fprofile&reason=expired')
      await expectExpiredBanner(page, isMobile)

      await submitLogin(page, USERS.ana)
      await expect(page).toHaveURL('/account/profile')
      await expect(heading(page, 'Perfil do colecionador')).toBeVisible()
    })

    test('AUTH-04: sessão expirada ao navegar pelo menu vai ao login com contexto e retoma a rota', async ({ page, isMobile }) => {
      test.setTimeout(60_000)
      await signInAndExpire(page)

      // Private links do not preload, so the guard of this navigation meets the 401 and keeps
      // the target URL in `redirect`.
      await accountButton(page, 'Ana Ribeiro').click()
      await page.getByRole('menuitem', { name: 'Carteiras' }).click()
      await expect(page).toHaveURL('/login?redirect=%2Faccount%2Fwallets&reason=expired')
      await expectExpiredBanner(page, isMobile)

      await submitLogin(page, USERS.ana)
      await expect(page).toHaveURL('/account/wallets')
      await expect(heading(page, 'Carteiras')).toBeVisible()
    })

    test('AUTH-05: logout pelo menu limpa a sessão e protege as rotas privadas', async ({ page, isMobile }) => {
      await open(page, '/login?redirect=%2Faccount%2Fprofile')
      await submitLogin(page, USERS.ana)
      await expect(heading(page, 'Perfil do colecionador')).toBeVisible()

      await logoutFromHeader(page, 'Ana Ribeiro')
      await expect(page).toHaveURL('/')
      await expect(page.getByTestId('live-region-polite')).toHaveText('Você saiu da sua conta.')
      expect(await readSession(page)).toBeNull()
      if (!isMobile) await expect(page.getByRole('banner').getByRole('link', { name: 'Entrar' })).toBeVisible()

      await goToLoginWithoutReload(page, isMobile)
      await page.goto('/favorites')
      await expect(page).toHaveURL('/login?redirect=%2Ffavorites')
    })

    test('AUTH-05: troca de usuário — Bruno nunca vê a sessão da Ana', async ({ page, isMobile }) => {
      await open(page, '/login?redirect=%2Faccount%2Fprofile')
      await submitLogin(page, USERS.ana)
      await expect(accountButton(page, 'Ana Ribeiro')).toBeVisible()
      const anaSession = await readSession(page)
      expect(anaSession?.userId).toBe(USERS.ana.id)

      await logoutFromHeader(page, 'Ana Ribeiro')
      await expect(page).toHaveURL('/')
      await goToLoginWithoutReload(page, isMobile)
      await submitLogin(page, USERS.bruno)

      await expect(accountButton(page, 'Bruno Costa')).toBeVisible()
      await expect(accountButton(page, 'Ana Ribeiro')).toHaveCount(0)
      await accountButton(page, 'Bruno Costa').click()
      const menu = page.getByRole('menu')
      await expect(menu).toContainText(USERS.bruno.email)
      await expect(menu).not.toContainText(USERS.ana.email)

      const brunoSession = await readSession(page)
      expect(brunoSession?.userId).toBe(USERS.bruno.id)
      expect(brunoSession?.token).not.toBe(anaSession?.token)
    })

    test('AUTH-06: toda rota privada sem sessão redireciona ao login com o redirect certo', async ({ page }) => {
      await prepare(page)
      for (const path of PRIVATE_ROUTES) {
        await page.goto(path)
        await expect(loginForm(page)).toBeVisible()
        const url = new URL(page.url())
        expect(url.pathname).toBe('/login')
        expect(url.searchParams.get('redirect')).toBe(path)
        expect(url.searchParams.get('reason')).toBeNull()
      }
    })
  })

  test.describe('Acessibilidade', () => {
    test('A11Y-01 A11Y-02: login só com teclado (Tab, alternar senha, Enter envia)', async ({ page, isMobile }) => {
      await open(page, '/login?redirect=%2Faccount%2Fprofile')
      const form = loginForm(page)
      const email = form.getByLabel('E-mail')
      const password = form.getByLabel('Senha', { exact: true })
      const toggle = form.getByRole('button', { name: 'Mostrar senha' })

      // Desktop: the modal focuses the first field on open. Mobile: a page, no autofocus.
      if (isMobile) await email.focus()
      await expect(email).toBeFocused()
      await page.keyboard.type(USERS.ana.email)
      await page.keyboard.press('Tab')
      await expect(password).toBeFocused()
      await page.keyboard.type(USERS.ana.password)

      await page.keyboard.press('Tab')
      await expect(toggle).toBeFocused()
      await expect(toggle).toHaveAttribute('aria-pressed', 'false')
      await page.keyboard.press('Space')
      await expect(toggle).toHaveAttribute('aria-pressed', 'true')
      await expect(password).toHaveAttribute('type', 'text')

      await page.keyboard.press('Tab')
      await expect(form.getByRole('button', { name: 'Esqueceu a senha?' })).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(form.getByRole('button', { name: 'Entrar', exact: true })).toBeFocused()

      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Shift+Tab')
      await expect(password).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL('/account/profile')
    })

    test('A11Y-02: modal prende o foco, Esc fecha e devolve o foco ao "Entrar" do header', async ({ page, isMobile }) => {
      test.skip(isMobile, 'No mobile o login é uma página inteira, não um diálogo')
      await open(page, '/cart')
      const headerLogin = page.getByRole('banner').getByRole('link', { name: 'Entrar' })
      await headerLogin.click()
      await expect(page).toHaveURL('/login?redirect=%2Fcart')

      const dialog = page.getByRole('dialog', { name: 'Entrar' })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByLabel('E-mail')).toBeFocused()
      for (let i = 0; i < 12; i += 1) {
        await page.keyboard.press('Tab')
        expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)
      }

      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(page).toHaveURL('/cart')
      await expect(headerLogin).toBeFocused()
    })

    test('A11Y-02: fechar (X ou fundo) com redirect privado não reabre o login', async ({ page, isMobile }) => {
      test.skip(isMobile, 'No mobile o login é uma página inteira, não um diálogo')
      await open(page, '/login?redirect=%2Faccount%2Fprofile')
      const dialog = page.getByRole('dialog', { name: 'Entrar' })
      await dialog.getByRole('button', { name: 'Fechar' }).click()
      await expect(dialog).toBeHidden()
      await expect(page).toHaveURL('/')
      await expect(page.locator('#conteudo')).toBeFocused()

      await page.goto('/login?redirect=%2Fcart')
      await expect(dialog).toBeVisible()
      await page.mouse.click(40, 450)
      await expect(dialog).toBeHidden()
      await expect(page).toHaveURL('/cart')
    })
  })
})
