import { useQuery } from '@tanstack/react-query'
import { nftDetailQuery } from '@/shared/api/endpoints/nfts'
import { toApiError } from '@/shared/api/errors'
import { DetailSkeleton } from './components/detail-skeleton'
import { NftLoadError, NftNotFound } from './components/detail-states'
import { useIsDesktop } from './lib/use-media-query'
import { NftDetailView } from './nft-detail-view'

/**
 * `/nft/$nftId` (NFT-01..NFT-06). Data states (GEN-05, GEN-06): skeleton while the first
 * response is pending, dedicated "NFT não encontrado" for an API 404 (NFT-03), error with
 * retry for anything else. Data already on screen survives a failed background refetch.
 */
export function NftDetailScreen({ nftId }: { nftId: string }) {
  const desktop = useIsDesktop()
  const detail = useQuery(nftDetailQuery(nftId))
  const retry = () => void detail.refetch()

  if (detail.data) {
    return (
      <NftDetailView
        key={detail.data.id}
        nft={detail.data}
        desktop={desktop}
        background={{ refreshing: detail.isRefetching, stale: detail.isRefetchError, onRetry: retry }}
      />
    )
  }
  if (detail.isError) {
    return toApiError(detail.error).status === 404 ? (
      <NftNotFound nftId={nftId} />
    ) : (
      <NftLoadError error={detail.error} onRetry={retry} />
    )
  }
  return <DetailSkeleton desktop={desktop} />
}
