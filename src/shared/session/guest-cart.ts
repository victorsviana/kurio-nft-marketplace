/**
 * Identifier of the visitor's cart, generated once and kept in localStorage. It travels in the
 * `X-Guest-Cart-Id` header so the cart survives refresh before login (CART-03) and can be
 * merged into the user's cart after authentication (CART-04).
 */
export const GUEST_CART_STORAGE_KEY = 'kurio.guestCartId'

let memoryId: string | null = null

export function getGuestCartId(): string {
  try {
    const existing = localStorage.getItem(GUEST_CART_STORAGE_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(GUEST_CART_STORAGE_KEY, id)
    return id
  } catch {
    memoryId ??= crypto.randomUUID()
    return memoryId
  }
}

/** After a successful merge the visitor cart is retired and a new id will be generated. */
export function rotateGuestCartId() {
  try {
    localStorage.removeItem(GUEST_CART_STORAGE_KEY)
  } catch {
    memoryId = null
  }
}
