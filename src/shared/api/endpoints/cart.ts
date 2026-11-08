import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cartSchema, type AddCartItemInput, type Cart } from '@/shared/contracts'
import { getGuestCartId } from '@/shared/session/guest-cart'
import { useStoredSession } from '@/shared/session/session-store'
import { cartOwnerKey, queryKeys } from '../query-keys'
import { apiRequest } from '../request'

export const cartQuery = (ownerKey: string) =>
  queryOptions({
    queryKey: queryKeys.cart.byOwner(ownerKey),
    queryFn: ({ signal }) => apiRequest(cartSchema, { url: '/cart', signal }),
  })

/** Cart owner of the current visitor/user; changes when the session changes. */
export function useCartOwnerKey(): string {
  const session = useStoredSession()
  return cartOwnerKey(session?.userId ?? null, getGuestCartId())
}

export function useCart() {
  return useQuery(cartQuery(useCartOwnerKey()))
}

/** Total units in the cart (header badge). */
export function cartUnits(cart: Cart | undefined): number {
  return cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
}

/** Units of an edition already in the cart (NFT-05 subtracts them from the selectable max). */
export function unitsInCart(cart: Cart | undefined, editionId: string): number {
  return cart?.items.find((item) => item.editionId === editionId)?.quantity ?? 0
}

/** POST /cart/items. The server enforces availability (409 INSUFFICIENT_AVAILABILITY). */
export function useAddToCart() {
  const queryClient = useQueryClient()
  const ownerKey = useCartOwnerKey()
  return useMutation({
    mutationFn: (input: AddCartItemInput) => apiRequest(cartSchema, { method: 'POST', url: '/cart/items', data: input }),
    onSuccess: (cart) => queryClient.setQueryData(queryKeys.cart.byOwner(ownerKey), cart),
  })
}
