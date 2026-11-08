import { http, HttpResponse } from 'msw'
import {
  addCartItemInputSchema,
  couponInputSchema,
  mergeCartInputSchema,
  quoteInputSchema,
  updateCartItemInputSchema,
} from '@/shared/contracts'
import { optionalAuth, requireAuth } from '../domain/auth'
import {
  addItem,
  applyCoupon,
  getOrCreateCart,
  mergeGuestCart,
  removeCoupon,
  removeItem,
  toCartDto,
  updateItemQuantity,
} from '../domain/cart'
import { createQuote, findQuote, toQuoteDto } from '../domain/quote'
import type { CartOwner } from '../db/types'
import { api, apiError, readBody } from '../lib/http'

/**
 * Cart and quote routes. Authenticated requests use the user's cart; visitors are identified by
 * X-Guest-Cart-Id. Availability and coupons are enforced here (CART-02, CART-05), and the quote
 * is the only source of subtotal, discount, fee and total (CART-06).
 */
function resolveOwner(request: Request): { ok: true; owner: CartOwner; userId: string | null } | { ok: false; response: Response } {
  const auth = optionalAuth(request)
  if (!auth.ok) return auth
  if (auth.user) return { ok: true, owner: { kind: 'user', userId: auth.user.id }, userId: auth.user.id }
  const guestId = request.headers.get('X-Guest-Cart-Id')
  if (!guestId) return { ok: false, response: apiError(400, 'BAD_REQUEST', 'Cabeçalho X-Guest-Cart-Id ausente.') }
  return { ok: true, owner: { kind: 'guest', guestId }, userId: null }
}

type Failure = { ok: false; status: number; code: Parameters<typeof apiError>[1]; message: string; details?: Record<string, unknown> }
const fail = (result: Failure) => apiError(result.status, result.code, result.message, { details: result.details })

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
    if (!result.ok) return fail(result)
    return HttpResponse.json(toCartDto(result.cart))
  }),

  http.patch(api('/cart/items/:itemId'), async ({ request, params }) => {
    const owner = resolveOwner(request)
    if (!owner.ok) return owner.response
    const body = await readBody(request, updateCartItemInputSchema)
    if (!body.ok) return body.response
    const result = updateItemQuantity(owner.owner, String(params.itemId), body.data.quantity)
    if (!result.ok) return fail(result)
    return HttpResponse.json(toCartDto(result.cart))
  }),

  http.delete(api('/cart/items/:itemId'), ({ request, params }) => {
    const owner = resolveOwner(request)
    if (!owner.ok) return owner.response
    const result = removeItem(owner.owner, String(params.itemId))
    if (!result.ok) return fail(result)
    return HttpResponse.json(toCartDto(result.cart))
  }),

  http.put(api('/cart/coupon'), async ({ request }) => {
    const owner = resolveOwner(request)
    if (!owner.ok) return owner.response
    const body = await readBody(request, couponInputSchema)
    if (!body.ok) return body.response
    const result = applyCoupon(owner.owner, body.data.code)
    if (!result.ok) return apiError(result.status, result.code, result.message, { fieldErrors: { code: result.message } })
    return HttpResponse.json(toCartDto(result.cart))
  }),

  http.delete(api('/cart/coupon'), ({ request }) => {
    const owner = resolveOwner(request)
    if (!owner.ok) return owner.response
    return HttpResponse.json(toCartDto(removeCoupon(owner.owner)))
  }),

  http.post(api('/cart/merge'), async ({ request }) => {
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const body = await readBody(request, mergeCartInputSchema)
    if (!body.ok) return body.response
    return HttpResponse.json(toCartDto(mergeGuestCart(auth.user.id, body.data.guestCartId)))
  }),

  http.post(api('/quote'), async ({ request }) => {
    const owner = resolveOwner(request)
    if (!owner.ok) return owner.response
    const body = await readBody(request, quoteInputSchema)
    if (!body.ok) return body.response
    const cart = getOrCreateCart(owner.owner)
    const previous = body.data.previousQuoteId ? findQuote(body.data.previousQuoteId) : undefined
    if (previous && previous.cartId !== cart.id) return apiError(403, 'FORBIDDEN', 'Esta cotação pertence a outro carrinho.')
    const quote = createQuote(cart, body.data.network ?? 'ethereum', owner.userId, previous)
    return HttpResponse.json(toQuoteDto(quote))
  }),
]
