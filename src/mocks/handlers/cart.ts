import { http, HttpResponse } from 'msw'
import { addCartItemInputSchema } from '@/shared/contracts'
import { optionalAuth } from '../domain/auth'
import { addItem, getOrCreateCart, toCartDto } from '../domain/cart'
import type { CartOwner } from '../db/types'
import { api, apiError, readBody } from '../lib/http'

/**
 * Cart routes (CP2 subset: read and add; quantity, removal, coupon and merge land in CP3).
 * Authenticated requests use the user's cart; visitors are identified by X-Guest-Cart-Id.
 */
function resolveOwner(request: Request): { ok: true; owner: CartOwner } | { ok: false; response: Response } {
  const auth = optionalAuth(request)
  if (!auth.ok) return auth
  if (auth.user) return { ok: true, owner: { kind: 'user', userId: auth.user.id } }
  const guestId = request.headers.get('X-Guest-Cart-Id')
  if (!guestId) return { ok: false, response: apiError(400, 'BAD_REQUEST', 'Cabeçalho X-Guest-Cart-Id ausente.') }
  return { ok: true, owner: { kind: 'guest', guestId } }
}

export const cartHandlers = [
  http.get(api('/cart'), ({ request }) => {
    const owner = resolveOwner(request)
    if (!owner.ok) return owner.response
    return HttpResponse.json(toCartDto(getOrCreateCart(owner.owner)))
  }),

  http.post(api('/cart/items'), async ({ request }) => {
    const owner = resolveOwner(request)
    if (!owner.ok) return owner.response
    const body = await readBody(request, addCartItemInputSchema)
    if (!body.ok) return body.response
    const result = addItem(owner.owner, body.data.nftId, body.data.editionId, body.data.quantity)
    if (!result.ok) return apiError(result.status, result.code, result.message, { details: result.details })
    return HttpResponse.json(toCartDto(result.cart))
  }),
]
