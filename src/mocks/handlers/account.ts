import { http, HttpResponse } from 'msw'
import { walletConnectInputSchema, type Profile } from '@/shared/contracts'
import { requireAuth } from '../domain/auth'
import { toSummary } from '../domain/catalog'
import { db, mutate } from '../db/store'
import type { UserRecord } from '../db/types'
import { api, apiError, nowIso, readBody } from '../lib/http'
import { getScenario } from '../scenarios/engine'

/** Favorites, profile and wallets of the authenticated user (FAV-01, WAL-03, CHK-03). */

function favoritesBody(userId: string) {
  const ids = db().favorites[userId] ?? []
  const items = ids.flatMap((id) => {
    const nft = db().nfts.find((n) => n.id === id)
    return nft ? [toSummary(nft)] : []
  })
  return { nftIds: ids, items }
}

export function toProfileDto(user: UserRecord): Profile {
  return {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    ensName: user.ensName,
    walletNickname: user.walletNickname,
    avatarUrl: user.avatarUrl,
    updatedAt: user.updatedAt,
  }
}

export const accountHandlers = [
  http.get(api('/favorites'), ({ request }) => {
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    return HttpResponse.json(favoritesBody(auth.user.id))
  }),

  http.put(api('/favorites/:nftId'), ({ request, params }) => {
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const nftId = String(params.nftId)
    if (!db().nfts.some((n) => n.id === nftId)) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    mutate((draft) => {
      const list = (draft.favorites[auth.user.id] ??= [])
      if (!list.includes(nftId)) list.unshift(nftId)
    })
    return HttpResponse.json(favoritesBody(auth.user.id))
  }),

  http.delete(api('/favorites/:nftId'), ({ request, params }) => {
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    mutate((draft) => {
      draft.favorites[auth.user.id] = (draft.favorites[auth.user.id] ?? []).filter((id) => id !== params.nftId)
    })
    return HttpResponse.json(favoritesBody(auth.user.id))
  }),

  http.get(api('/profile'), ({ request }) => {
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    return HttpResponse.json(toProfileDto(auth.user))
  }),

  http.get(api('/wallets'), ({ request }) => {
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    return HttpResponse.json(db().wallets[auth.user.id] ?? { primary: null, secondary: null })
  }),

  /**
   * Simulated wallet connection (CHK-03). The scenario `wallet-rejected` refuses it; the control
   * API `wallets.disconnectAll()` drops existing connections, and POST /orders then answers
   * 422 WALLET_DISCONNECTED.
   */
  http.post(api('/wallets/:walletId/connect'), async ({ request, params }) => {
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const body = await readBody(request, walletConnectInputSchema)
    if (!body.ok) return body.response
    const pair = db().wallets[auth.user.id]
    const wallet = [pair?.primary, pair?.secondary].find((w) => w?.id === params.walletId)
    if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
    if (getScenario().walletRejects) {
      return apiError(422, 'WALLET_REJECTED', 'A carteira recusou a conexão. Tente novamente ou escolha outra carteira.')
    }
    mutate((draft) => {
      draft.walletConnections = draft.walletConnections.filter(
        (c) => !(c.userId === auth.user.id && c.walletId === wallet.id),
      )
      draft.walletConnections.push({
        userId: auth.user.id,
        walletId: wallet.id,
        network: body.data.network,
        kind: body.data.kind,
        connectedAt: nowIso(),
      })
    })
    return HttpResponse.json({ status: 'connected' })
  }),

  http.delete(api('/wallets/:walletId/connect'), ({ request, params }) => {
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    mutate((draft) => {
      draft.walletConnections = draft.walletConnections.filter(
        (c) => !(c.userId === auth.user.id && c.walletId === params.walletId),
      )
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
