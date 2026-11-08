import Big from 'big.js'
import type { Cart } from '@/shared/contracts'
import { artImage } from '../db/fixtures'
import { db, mutate } from '../db/store'
import type { CartOwner, CartRecord, DbState } from '../db/types'
import { nowIso } from '../lib/http'

/**
 * Cart rules of the simulated backend. A visitor's cart is keyed by the `X-Guest-Cart-Id`
 * header; an authenticated user's cart by user id. Availability is enforced here (409).
 */

const sameOwner = (a: CartOwner, b: CartOwner) =>
  a.kind === b.kind && (a.kind === 'user' ? a.userId === (b as typeof a).userId : a.guestId === (b as typeof a).guestId)

export function findCart(state: Readonly<DbState>, owner: CartOwner): CartRecord | undefined {
  return state.carts.find((c) => sameOwner(c.owner, owner))
}

export function getOrCreateCart(owner: CartOwner): CartRecord {
  const existing = findCart(db(), owner)
  if (existing) return existing
  return mutate((draft) => {
    const cart: CartRecord = {
      id: `cart-${crypto.randomUUID()}`,
      owner,
      items: [],
      couponCode: null,
      version: 0,
      updatedAt: nowIso(),
    }
    draft.carts.push(cart)
    return cart
  })
}

export function toCartDto(cart: CartRecord): Cart {
  const nfts = db().nfts
  const items = cart.items.flatMap((item) => {
    const nft = nfts.find((n) => n.id === item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    if (!nft || !edition) return []
    return [
      {
        id: item.id,
        nftId: nft.id,
        editionId: edition.id,
        name: nft.name,
        image: artImage(nft.art),
        tokenId: nft.tokenId,
        editionLabel: edition.label,
        unitPrice: edition.price,
        quantity: item.quantity,
        available: edition.available,
        lineTotal: new Big(edition.price).times(item.quantity).toString(),
      },
    ]
  })
  return { id: cart.id, items, couponCode: cart.couponCode, version: cart.version }
}

export type CartMutationResult =
  | { ok: true; cart: CartRecord }
  | { ok: false; status: number; code: 'NOT_FOUND' | 'INSUFFICIENT_AVAILABILITY'; message: string; details?: Record<string, unknown> }

export function addItem(owner: CartOwner, nftId: string, editionId: string, quantity: number): CartMutationResult {
  const nft = db().nfts.find((n) => n.id === nftId)
  const edition = nft?.editions.find((e) => e.id === editionId)
  if (!nft || !edition) return { ok: false, status: 404, code: 'NOT_FOUND', message: 'NFT ou edição não encontrado.' }
  const cart = getOrCreateCart(owner)
  const existing = cart.items.find((i) => i.editionId === editionId)
  const desired = (existing?.quantity ?? 0) + quantity
  if (desired > edition.available) {
    return {
      ok: false,
      status: 409,
      code: 'INSUFFICIENT_AVAILABILITY',
      message:
        edition.available === 0
          ? `A edição ${edition.label} está esgotada.`
          : `Só restam ${edition.available} unidade(s) da edição ${edition.label}.`,
      details: { available: edition.available, inCart: existing?.quantity ?? 0 },
    }
  }
  return {
    ok: true,
    cart: mutate((draft) => {
      const target = findCart(draft, owner)!
      const line = target.items.find((i) => i.editionId === editionId)
      if (line) line.quantity = desired
      else target.items.push({ id: `item-${crypto.randomUUID()}`, nftId, editionId, quantity, addedAt: nowIso() })
      target.version += 1
      target.updatedAt = nowIso()
      return target
    }),
  }
}

function touch(cart: CartRecord) {
  cart.version += 1
  cart.updatedAt = nowIso()
}

/** PATCH /cart/items/:id — the new quantity can never exceed the edition stock (CART-02). */
export function updateItemQuantity(owner: CartOwner, itemId: string, quantity: number): CartMutationResult {
  const cart = findCart(db(), owner)
  const item = cart?.items.find((i) => i.id === itemId)
  if (!cart || !item) return { ok: false, status: 404, code: 'NOT_FOUND', message: 'Item não encontrado no carrinho.' }
  const nft = db().nfts.find((n) => n.id === item.nftId)
  const edition = nft?.editions.find((e) => e.id === item.editionId)
  if (!nft || !edition) return { ok: false, status: 404, code: 'NOT_FOUND', message: 'NFT ou edição não encontrado.' }
  if (quantity > edition.available) {
    return {
      ok: false,
      status: 409,
      code: 'INSUFFICIENT_AVAILABILITY',
      message:
        edition.available === 0
          ? `A edição ${edition.label} de ${nft.name} está esgotada.`
          : `Só restam ${edition.available} unidade(s) da edição ${edition.label} de ${nft.name}.`,
      details: { available: edition.available, itemId },
    }
  }
  return {
    ok: true,
    cart: mutate((draft) => {
      const target = findCart(draft, owner)!
      target.items.find((i) => i.id === itemId)!.quantity = quantity
      touch(target)
      return target
    }),
  }
}

export function removeItem(owner: CartOwner, itemId: string): CartMutationResult {
  const cart = findCart(db(), owner)
  if (!cart || !cart.items.some((i) => i.id === itemId)) {
    return { ok: false, status: 404, code: 'NOT_FOUND', message: 'Item não encontrado no carrinho.' }
  }
  return {
    ok: true,
    cart: mutate((draft) => {
      const target = findCart(draft, owner)!
      target.items = target.items.filter((i) => i.id !== itemId)
      touch(target)
      return target
    }),
  }
}

export type CouponCheck = { status: 'applied'; percentOff: string } | { status: 'invalid' } | { status: 'expired' }

export function checkCoupon(state: Readonly<DbState>, code: string): CouponCheck {
  const coupon = state.coupons.find((c) => c.code === code.toUpperCase())
  if (!coupon) return { status: 'invalid' }
  if (Date.parse(coupon.expiresAt) <= Date.now()) return { status: 'expired' }
  return { status: 'applied', percentOff: coupon.percentOff }
}

export type CouponResult =
  | { ok: true; cart: CartRecord }
  | { ok: false; status: 422; code: 'COUPON_INVALID' | 'COUPON_EXPIRED'; message: string }

/** PUT /cart/coupon — invalid and expired codes have distinct errors (CART-05). */
export function applyCoupon(owner: CartOwner, code: string): CouponResult {
  const check = checkCoupon(db(), code)
  if (check.status === 'invalid') {
    return { ok: false, status: 422, code: 'COUPON_INVALID', message: `O cupom ${code} não existe.` }
  }
  if (check.status === 'expired') {
    return { ok: false, status: 422, code: 'COUPON_EXPIRED', message: `O cupom ${code} expirou.` }
  }
  getOrCreateCart(owner)
  return {
    ok: true,
    cart: mutate((draft) => {
      const target = findCart(draft, owner)!
      target.couponCode = code.toUpperCase()
      touch(target)
      return target
    }),
  }
}

export function removeCoupon(owner: CartOwner): CartRecord {
  getOrCreateCart(owner)
  return mutate((draft) => {
    const target = findCart(draft, owner)!
    target.couponCode = null
    touch(target)
    return target
  })
}

/**
 * POST /cart/merge — the visitor's lines move into the user's cart (CART-04). Quantities of
 * the same edition are summed and clamped to the stock; the visitor cart is deleted, so a
 * repeated merge is a no-op.
 */
export function mergeGuestCart(userId: string, guestId: string): CartRecord {
  const owner: CartOwner = { kind: 'user', userId }
  getOrCreateCart(owner)
  return mutate((draft) => {
    const target = findCart(draft, owner)!
    const guest = findCart(draft, { kind: 'guest', guestId })
    if (!guest || guest.items.length === 0) {
      if (guest) draft.carts = draft.carts.filter((c) => c !== guest)
      return target
    }
    for (const line of guest.items) {
      const edition = draft.nfts.find((n) => n.id === line.nftId)?.editions.find((e) => e.id === line.editionId)
      if (!edition) continue
      const existing = target.items.find((i) => i.editionId === line.editionId)
      const desired = Math.min((existing?.quantity ?? 0) + line.quantity, edition.available)
      if (desired <= 0) continue
      if (existing) existing.quantity = desired
      else target.items.push({ ...line, id: `item-${crypto.randomUUID()}`, quantity: desired })
    }
    target.couponCode ??= guest.couponCode
    draft.carts = draft.carts.filter((c) => c !== guest)
    touch(target)
    return target
  })
}

/** After a confirmed order: removes only the purchased quantities (ORD-04). Runs inside `mutate`. */
export function removePurchasedLines(draft: DbState, userId: string, lines: { editionId: string; quantity: number }[]) {
  const cart = findCart(draft, { kind: 'user', userId })
  if (!cart) return
  for (const line of lines) {
    const item = cart.items.find((i) => i.editionId === line.editionId)
    if (!item) continue
    item.quantity -= line.quantity
  }
  cart.items = cart.items.filter((i) => i.quantity > 0)
  touch(cart)
}
