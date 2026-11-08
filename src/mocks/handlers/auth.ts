import { http, HttpResponse } from 'msw'
import { loginInputSchema, registerInputSchema } from '@/shared/contracts'
import { authResponse, createSession, requireAuth, revokeSession } from '../domain/auth'
import { db, mutate } from '../db/store'
import type { UserRecord } from '../db/types'
import { hashPassword, randomSalt } from '../lib/crypto'
import { api, apiError, nowIso, readBody } from '../lib/http'

export const authHandlers = [
  http.post(api('/auth/register'), async ({ request }) => {
    const body = await readBody(request, registerInputSchema)
    if (!body.ok) return body.response
    const { username, email, password } = body.data
    const displayName = body.data.displayName ?? username

    const fieldErrors: Record<string, string> = {}
    if (db().users.some((u) => u.email === email)) fieldErrors.email = 'Este e-mail já está cadastrado.'
    if (db().users.some((u) => u.username === username)) fieldErrors.username = 'Este nome de usuário já está em uso.'
    if (fieldErrors.email || fieldErrors.username) {
      return apiError(409, fieldErrors.email ? 'EMAIL_TAKEN' : 'USERNAME_TAKEN', 'Já existe uma conta com esses dados.', {
        fieldErrors,
      })
    }

    const salt = randomSalt()
    const user: UserRecord = {
      id: `user-${crypto.randomUUID()}`,
      displayName,
      username,
      email,
      ensName: '',
      walletNickname: '',
      avatarUrl: null,
      salt,
      passwordHash: await hashPassword(password, salt),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    mutate((draft) => {
      draft.users.push(user)
      draft.favorites[user.id] = []
      draft.wallets[user.id] = { primary: null, secondary: null }
    })
    return HttpResponse.json(authResponse(user, createSession(user.id)), { status: 201 })
  }),

  http.post(api('/auth/login'), async ({ request }) => {
    const body = await readBody(request, loginInputSchema)
    if (!body.ok) return body.response
    const user = db().users.find((u) => u.email === body.data.email)
    const valid = user && (await hashPassword(body.data.password, user.salt)) === user.passwordHash
    if (!user || !valid) return apiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    return HttpResponse.json(authResponse(user, createSession(user.id)))
  }),

  http.get(api('/auth/session'), ({ request }) => {
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    return HttpResponse.json(authResponse(auth.user, auth.session))
  }),

  http.post(api('/auth/logout'), ({ request }) => {
    const token = request.headers.get('Authorization')?.replace(/^Bearer /, '')
    if (token) revokeSession(token)
    return new HttpResponse(null, { status: 204 })
  }),
]
