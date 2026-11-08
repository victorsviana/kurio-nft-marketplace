import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import {
  featuredResponseSchema,
  nftDetailSchema,
  nftListResponseSchema,
  relatedResponseSchema,
  type CatalogSearch,
} from '@/shared/contracts'
import { queryKeys } from '../query-keys'
import { apiRequest } from '../request'

/** Removes undefined values so the request carries exactly the URL params (CAT-06). */
function definedParams(params: CatalogSearch): Record<string, string | number> {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string | number>
}

/**
 * Catalog list. The key is the exact param object, and TanStack Query passes an AbortSignal
 * that Axios honors, so a superseded search is cancelled and can never overwrite the newest
 * one (CAT-08). Previous data stays on screen while the next page loads (background update).
 */
export const nftListQuery = (params: CatalogSearch) =>
  queryOptions({
    queryKey: queryKeys.nfts.list(params),
    queryFn: ({ signal }) => apiRequest(nftListResponseSchema, { url: '/nfts', params: definedParams(params), signal }),
    placeholderData: keepPreviousData,
  })

export const featuredQuery = () =>
  queryOptions({
    queryKey: queryKeys.nfts.featured(),
    queryFn: ({ signal }) => apiRequest(featuredResponseSchema, { url: '/nfts/featured', signal }),
    staleTime: 5 * 60_000,
  })

export const nftDetailQuery = (nftId: string) =>
  queryOptions({
    queryKey: queryKeys.nfts.detail(nftId),
    queryFn: ({ signal }) => apiRequest(nftDetailSchema, { url: `/nfts/${encodeURIComponent(nftId)}`, signal }),
  })

export const relatedQuery = (nftId: string) =>
  queryOptions({
    queryKey: queryKeys.nfts.related(nftId),
    queryFn: ({ signal }) =>
      apiRequest(relatedResponseSchema, { url: `/nfts/${encodeURIComponent(nftId)}/related`, signal }),
  })
