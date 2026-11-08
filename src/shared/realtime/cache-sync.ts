import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/query-keys'
import type {
  Cart,
  FeaturedResponse,
  NftDetail,
  NftListResponse,
  NftSummary,
  NftUpdatedEvent,
  Order,
} from '@/shared/contracts'
import type { RealtimeClient } from './realtime-client'

/**
 * Applies realtime events to the TanStack Query cache (RT-02, RT-03) and reconciles active
 * resources with REST after a reconnection (RT-06). Each cache write also checks the
 * resource version stored in the cached data, so an event older than what REST already
 * returned never regresses the screen (RT-05).
 */

function patchSummary<T extends NftSummary>(nft: T, event: NftUpdatedEvent): T {
  if (nft.id !== event.data.nftId || event.version <= nft.version) return nft
  return {
    ...nft,
    price: event.data.price,
    compareAtPrice: event.data.compareAtPrice,
    available: event.data.available,
    version: event.version,
  }
}

export function registerCacheSync(client: RealtimeClient, queryClient: QueryClient, userId: string | null) {
  const offNft = client.on('nft.updated', (event) => {
    const nftId = event.data.nftId

    queryClient.setQueryData<NftDetail>(queryKeys.nfts.detail(nftId), (old) => {
      if (!old || event.version <= old.version) return old
      return { ...patchSummary(old, event), editions: event.data.editions }
    })
    queryClient.setQueriesData<NftListResponse>({ queryKey: queryKeys.nfts.lists() }, (old) =>
      old ? { ...old, items: old.items.map((item) => patchSummary(item, event)) } : old,
    )
    queryClient.setQueriesData<{ items: NftSummary[] }>({ queryKey: ['nfts', 'related'] }, (old) =>
      old ? { ...old, items: old.items.map((item) => patchSummary(item, event)) } : old,
    )
    queryClient.setQueryData<FeaturedResponse>(queryKeys.nfts.featured(), (old) =>
      old ? { hero: patchSummary(old.hero, event), spotlight: patchSummary(old.spotlight, event) } : old,
    )

    // Cart lines carry price and availability computed by the server: refetch carts that
    // contain the NFT instead of recomputing totals on the client (constitution §2.4).
    const affectsCart = queryClient
      .getQueriesData<Cart>({ queryKey: queryKeys.cart.all })
      .some(([, cart]) => cart?.items.some((item) => item.nftId === nftId))
    if (affectsCart) void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
  })

  const offOrder = client.on('order.updated', (event) => {
    if (!userId) return
    queryClient.setQueryData<Order>(queryKeys.me.order(userId, event.data.orderId), (old) => {
      if (!old || event.version <= old.version) return old
      return { ...old, status: event.data.status, txHash: event.data.txHash, declineReason: event.data.declineReason, version: event.version }
    })
    // Receipt fields (confirmedAt, explorerUrl) come from REST.
    void queryClient.invalidateQueries({ queryKey: queryKeys.me.orders(userId) })
  })

  const offReconnect = client.onReconnect(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
    if (userId) void queryClient.invalidateQueries({ queryKey: queryKeys.me.orders(userId) })
  })

  return () => {
    offNft()
    offOrder()
    offReconnect()
  }
}
