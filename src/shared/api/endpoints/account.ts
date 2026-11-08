import { queryOptions } from '@tanstack/react-query'
import {
  activeOrderResponseSchema,
  favoritesResponseSchema,
  orderSchema,
  profileSchema,
  walletConnectResponseSchema,
  walletsResponseSchema,
  type Network,
  type WalletKind,
} from '@/shared/contracts'
import { queryKeys } from '../query-keys'
import { apiRequest, apiRequestVoid } from '../request'

/** Private resources: every key carries the user id (constitution §4, AUTH-05). */

export const favoritesQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.me.favorites(userId),
    queryFn: ({ signal }) => apiRequest(favoritesResponseSchema, { url: '/favorites', signal }),
  })

export const setFavorite = (nftId: string, favorite: boolean) =>
  apiRequest(favoritesResponseSchema, { method: favorite ? 'PUT' : 'DELETE', url: `/favorites/${encodeURIComponent(nftId)}` })

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.me.profile(userId),
    queryFn: ({ signal }) => apiRequest(profileSchema, { url: '/profile', signal }),
  })

export const walletsQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.me.wallets(userId),
    queryFn: ({ signal }) => apiRequest(walletsResponseSchema, { url: '/wallets', signal }),
  })

/** Simulated wallet connection (CHK-03): 422 WALLET_REJECTED in the `wallet-rejected` scenario. */
export const connectWallet = (walletId: string, network: Network, kind: WalletKind) =>
  apiRequest(walletConnectResponseSchema, {
    method: 'POST',
    url: `/wallets/${encodeURIComponent(walletId)}/connect`,
    data: { network, kind },
  })

export const disconnectWallet = (walletId: string) =>
  apiRequestVoid({ method: 'DELETE', url: `/wallets/${encodeURIComponent(walletId)}/connect` })

export const orderQuery = (userId: string, orderId: string) =>
  queryOptions({
    queryKey: queryKeys.me.order(userId, orderId),
    queryFn: ({ signal }) => apiRequest(orderSchema, { url: `/orders/${encodeURIComponent(orderId)}`, signal }),
  })

export const activeOrderQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.me.activeOrder(userId),
    queryFn: async ({ signal }) => (await apiRequest(activeOrderResponseSchema, { url: '/orders/active', signal })).order,
    staleTime: 0,
  })
