import { createFileRoute } from '@tanstack/react-router'
import { NftDetailScreen } from '@/features/nft-detail/nft-detail-screen'
import { nftDetailQuery } from '@/shared/api/endpoints/nfts'

export const Route = createFileRoute('/nft/$nftId')({
  staticData: { section: 'mercado', headerDivider: false, mobileHeader: false, mobileFooter: false },
  // Non-blocking prefetch: the request starts with the navigation (or on link hover through
  // `defaultPreload: 'intent'`) while the screen renders its skeleton (GEN-05).
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftDetailQuery(params.nftId))
  },
  component: NftDetailRoute,
})

function NftDetailRoute() {
  const { nftId } = Route.useParams()
  // Keyed by id: navigating to a related NFT resets edition, quantity and gallery state.
  return <NftDetailScreen key={nftId} nftId={nftId} />
}
