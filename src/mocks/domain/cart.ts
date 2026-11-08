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
