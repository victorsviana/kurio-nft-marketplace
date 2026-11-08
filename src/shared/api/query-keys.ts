import type { CatalogSearch } from '@/shared/contracts'

/**
 * Query key factory. Isolation rules (constitution §4):
 * - every private resource lives under ['me', userId, ...] so logout or a user switch removes
 *   the whole private tree with one call and user B can never hit user A's cache entry;
 * - the cart key carries its owner (user id or visitor cart id);
 * - catalog lists are keyed by the exact URL params (CAT-08).
 */
export const queryKeys = {
  session: (token: string | null) => ['session', token] as const,

  nfts: {
    all: ['nfts'] as const,
    lists: () => ['nfts', 'list'] as const,
    list: (params: CatalogSearch) => ['nfts', 'list', params] as const,
    details: () => ['nfts', 'detail'] as const,
    detail: (nftId: string) => ['nfts', 'detail', nftId] as const,
    featured: () => ['nfts', 'featured'] as const,
    related: (nftId: string) => ['nfts', 'related', nftId] as const,
  },

  cart: {
    all: ['cart'] as const,
    byOwner: (ownerKey: string) => ['cart', ownerKey] as const,
  },

  me: {
    all: ['me'] as const,
    scope: (userId: string) => ['me', userId] as const,
    favorites: (userId: string) => ['me', userId, 'favorites'] as const,
    profile: (userId: string) => ['me', userId, 'profile'] as const,
    wallets: (userId: string) => ['me', userId, 'wallets'] as const,
    orders: (userId: string) => ['me', userId, 'orders'] as const,
    order: (userId: string, orderId: string) => ['me', userId, 'orders', orderId] as const,
    activeOrder: (userId: string) => ['me', userId, 'orders', 'active'] as const,
    quote: (userId: string) => ['me', userId, 'quote'] as const,
  },
}

/** Owner key of the cart: the user when authenticated, otherwise the visitor cart id. */
export const cartOwnerKey = (userId: string | null, guestCartId: string) =>
  userId ? `user:${userId}` : `guest:${guestCartId}`
