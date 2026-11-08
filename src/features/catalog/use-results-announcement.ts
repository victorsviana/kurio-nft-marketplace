import { useEffect, useRef } from 'react'
import { useAnnounce } from '@/shared/a11y/announcer'
import type { CatalogSearch, NftListResponse } from '@/shared/contracts'

export function resultsMessage(data: Pick<NftListResponse, 'total' | 'page' | 'totalPages'>): string {
  if (data.total === 0) return 'Nenhum NFT encontrado'
  const count = `${data.total} ${data.total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}`
  return data.totalPages > 1 ? `${count}, página ${data.page} de ${data.totalPages}` : count
}

/**
 * Politely announces the result count when the search params change (A11Y-04). Keyed on the
 * params, not on the data object, so realtime price patches never re-announce. The first
 * load is not announced.
 */
export function useResultsAnnouncement(search: CatalogSearch, data: NftListResponse | undefined, isPlaceholderData: boolean) {
  const announce = useAnnounce()
  const key = JSON.stringify(search)
  const lastKey = useRef<string | null>(null)
  const ready = data !== undefined && !isPlaceholderData
  const total = data?.total
  const page = data?.page
  const totalPages = data?.totalPages

  useEffect(() => {
    if (!ready || total === undefined || page === undefined || totalPages === undefined) return
    if (lastKey.current === null) {
      lastKey.current = key
      return
    }
    if (lastKey.current === key) return
    lastKey.current = key
    announce(resultsMessage({ total, page, totalPages }))
  }, [announce, key, ready, total, page, totalPages])
}
