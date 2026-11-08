import { getRouteApi } from '@tanstack/react-router'
import { useCallback } from 'react'
import type { CatalogSearch } from '@/shared/contracts'
import { canonicalSearch } from './lib/search'

const routeApi = getRouteApi('/')

export type CatalogFilterPatch = Partial<Omit<CatalogSearch, 'page'>>

/**
 * Catalog state lives in the URL only (CAT-02). Every filter, search or sort change pushes a
 * history entry (back/forward restores it), drops `page` (CAT-05) and omits default values.
 * `resetScroll: false` keeps the user where they are while the grid updates.
 */
export function useCatalogSearch() {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  const update = useCallback(
    (patch: CatalogFilterPatch) =>
      navigate({
        to: '/',
        search: (prev) => canonicalSearch({ ...prev, ...patch, page: undefined }),
        resetScroll: false,
      }),
    [navigate],
  )

  /** Clears search and filters; the sort order is kept. */
  const clearFilters = useCallback(
    () =>
      navigate({
        to: '/',
        search: (prev) => canonicalSearch({ sort: prev.sort }),
        resetScroll: false,
      }),
    [navigate],
  )

  return { search, update, clearFilters }
}
