import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  cartSchema,
  quoteSchema,
  type AddCartItemInput,
  type Cart,
  type Network,
  type QuoteInput,
} from '@/shared/contracts'
import { getGuestCartId } from '@/shared/session/guest-cart'
import { useStoredSession } from '@/shared/session/session-store'
import { cartOwnerKey, queryKeys } from '../query-keys'
import { apiRequest } from '../request'

/**
 * Cart and quote (CART-01..CART-08). The server owns prices, stock and totals: every mutation
 * stores the cart it returns and re-prices the quote, which is the only source of the summary
 * values (CART-06). Cart mutations are not optimistic on purpose: a quantity the server may
 * refuse (409) must not flash a total that never existed.
 */

export const cartQuery = (ownerKey: string) =>
  queryOptions({
    queryKey: queryKeys.cart.byOwner(ownerKey),
    queryFn: ({ signal }) => apiRequest(cartSchema, { url: '/cart', signal }),
  })

/**
 * POST /quote used as a query: it has no side effect on the cart, and its key lives under the
 * cart key, so any cart change re-prices it. `staleTime: 0` because a quote is only meaningful
 * for the cart version it priced.
 */
export const quoteQuery = (ownerKey: string, network: Network) =>
  queryOptions({
    queryKey: queryKeys.cart.quote(ownerKey, network),
    queryFn: ({ signal }) => fetchQuote({ network }, signal),
    staleTime: 0,
  })

export function fetchQuote(input: QuoteInput, signal?: AbortSignal) {
  return apiRequest(quoteSchema, { method: 'POST', url: '/quote', data: input, signal })
}

/** Cart owner of the current visitor/user; changes when the session changes. */
export function useCartOwnerKey(): string {
  const session = useStoredSession()
  return cartOwnerKey(session?.userId ?? null, getGuestCartId())
}

export function useCart() {
  return useQuery(cartQuery(useCartOwnerKey()))
}

export function useCartQuote(network: Network = 'ethereum', options: { enabled?: boolean } = {}) {
  return useQuery({ ...quoteQuery(useCartOwnerKey(), network), enabled: options.enabled ?? true })
}

/** Total units in the cart (header badge). */
export function cartUnits(cart: Cart | undefined): number {
  return cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
}

/** Units of an edition already in the cart (NFT-05 subtracts them from the selectable max). */
export function unitsInCart(cart: Cart | undefined, editionId: string): number {
  return cart?.items.find((item) => item.editionId === editionId)?.quantity ?? 0
}

/** Stores the server's cart and re-prices the quote. */
export function storeCart(queryClient: QueryClient, ownerKey: string, cart: Cart) {
  queryClient.setQueryData(queryKeys.cart.byOwner(ownerKey), cart)
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.cart.byOwner(ownerKey), 'quote'] })
}

function useCartMutation<TInput>(request: (input: TInput) => Promise<Cart>) {
  const queryClient = useQueryClient()
  const ownerKey = useCartOwnerKey()
  return useMutation({
    mutationFn: request,
    onSuccess: (cart) => storeCart(queryClient, ownerKey, cart),
    onError: (error: unknown) => {
      // 409 (stock changed) / 404 (line gone): the cached cart is outdated, reload it.
      const status = (error as { status?: number }).status
      if (status === 409 || status === 404) void queryClient.invalidateQueries({ queryKey: queryKeys.cart.byOwner(ownerKey) })
    },
  })
}

/** POST /cart/items. The server enforces availability (409 INSUFFICIENT_AVAILABILITY). */
export function useAddToCart() {
  return useCartMutation((input: AddCartItemInput) =>
    apiRequest(cartSchema, { method: 'POST', url: '/cart/items', data: input }),
  )
}

export function useUpdateCartItem() {
  return useCartMutation(({ itemId, quantity }: { itemId: string; quantity: number }) =>
    apiRequest(cartSchema, { method: 'PATCH', url: `/cart/items/${encodeURIComponent(itemId)}`, data: { quantity } }),
  )
}

export function useRemoveCartItem() {
  return useCartMutation((itemId: string) =>
    apiRequest(cartSchema, { method: 'DELETE', url: `/cart/items/${encodeURIComponent(itemId)}` }),
  )
}

export function useApplyCoupon() {
  return useCartMutation((code: string) => apiRequest(cartSchema, { method: 'PUT', url: '/cart/coupon', data: { code } }))
}

export function useRemoveCoupon() {
  return useCartMutation(() => apiRequest(cartSchema, { method: 'DELETE', url: '/cart/coupon' }))
}

/**
 * CART-04: moves the visitor's lines into the user's cart. Called by the login/register flow
 * with the NEW token before the session starts, so the first authenticated cart read already
 * sees the merged cart.
 */
export function mergeGuestCart(token: string, guestCartId: string) {
  return apiRequest(cartSchema, {
    method: 'POST',
    url: '/cart/merge',
    data: { guestCartId },
    headers: { Authorization: `Bearer ${token}` },
  })
}
