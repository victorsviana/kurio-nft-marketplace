import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal } from 'lucide-react'
import iconFilter from '@/assets/icons/icon-filter.svg'
import { Button } from '@/components/ui/button'
import { nftListQuery } from '@/shared/api/endpoints/nfts'
import { csvValues, hasActiveFilters, hasRefinements } from './lib/search'
import { ActiveFilters } from './components/active-filters'
import { Blog } from './components/blog'
import { CatalogResults } from './components/catalog-results'
import { CatalogTabs } from './components/catalog-tabs'
import { FeaturedBanner } from './components/featured-banner'
import { FiltersPanel } from './components/filters-panel'
import { FiltersSheet } from './components/filters-sheet'
import { DesktopHero, MobileHero } from './components/hero'
import { MobileSearch } from './components/mobile-search'
import { Promos } from './components/promos'
import { SortSelect } from './components/sort-control'
import { useCatalogSearch } from './use-catalog-search'
import { MEDIA, scrollToCatalog, useMediaQuery } from './use-media-query'
import { useResultsAnnouncement } from './use-results-announcement'

/**
 * Início (Desktop node 2:2, Mobile node 14:5226). Layout per breakpoint:
 * - < 768: Mobile / Início frame (search + filter button on top, compact hero, 2 staggered
 *   columns); filters and sort live in a Sheet.
 * - 768–1023: desktop hero and cards in 3 fluid columns; filters in a Sheet opened from the
 *   toolbar.
 * - ≥ 1024: sidebar with filters and the featured banner (exact Figma geometry at ≥ 1280).
 *
 * The URL is the single source of truth (CAT-02..CAT-06): the list query key is the
 * validated search object, so a stale response can never overwrite the newest one (CAT-08).
 */
export function CatalogPage() {
  const isDesktop = useMediaQuery(MEDIA.md)
  const hasSidebar = useMediaQuery(MEDIA.lg)
  const { search, update, clearFilters } = useCatalogSearch()
  const list = useQuery(nftListQuery(search))
  const { data, isFetching, isPlaceholderData } = list
  useResultsAnnouncement(search, data, isPlaceholderData)

  const filtersActive = hasActiveFilters(search)
  const facets = data?.facets
  const facetsLoading = !data && !list.isError
  const activeCount =
    csvValues(search.category).length + csvValues(search.network).length + (search.minPrice || search.maxPrice ? 1 : 0)

  const sheetProps = {
    search,
    facets,
    facetsLoading,
    total: data?.total,
    updating: isFetching,
    onChange: update,
    onClear: clearFilters,
  }
  const filterLabel = activeCount > 0 ? `Filtros, ${activeCount} ${activeCount === 1 ? 'ativo' : 'ativos'}` : 'Filtros'

  return (
    <div className="mx-auto flex w-full max-w-page flex-col px-6 pt-10 md:px-8 md:pt-8 xl:px-0">
      <div className="flex flex-col gap-4">
        {!isDesktop && (
          <div className="flex items-center gap-2">
            <MobileSearch
              key={search.q ?? ''}
              initialValue={search.q ?? ''}
              onSubmit={(q) => {
                void update({ q: q.trim() || undefined })
                scrollToCatalog()
              }}
            />
            <FiltersSheet
              {...sheetProps}
              withSort
              trigger={
                <button
                  type="button"
                  aria-label={filterLabel}
                  className="relative grid size-[45px] shrink-0 place-items-center rounded-[14px] bg-[linear-gradient(137deg,rgba(210,138,76,0.45)_24.6%,#d28a4c_100%)]"
                >
                  <img src={iconFilter} alt="" aria-hidden="true" width={16} height={16} />
                  {activeCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-fg text-[10px] leading-none font-bold text-ink"
                    >
                      {activeCount}
                    </span>
                  )}
                </button>
              }
            />
          </div>
        )}
        {isDesktop ? <DesktopHero /> : <MobileHero />}
      </div>

      <section
        id="catalogo"
        aria-labelledby="catalogo-titulo"
        className="mt-4 flex scroll-mt-6 gap-8 md:mt-24 xl:gap-12"
      >
        <h2 id="catalogo-titulo" className="sr-only">
          Catálogo de NFTs
        </h2>
        {hasSidebar && (
          <aside aria-label="Filtros do catálogo" className="flex w-[260px] shrink-0 flex-col gap-6 xl:w-[310px]">
            <FiltersPanel search={search} facets={facets} facetsLoading={facetsLoading} onChange={update} className="bg-surface" />
            <FeaturedBanner variant="sidebar" />
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <CatalogTabs
            value={search.tab}
            onChange={(tab) => void update({ tab })}
            toolbarEnd={
              isDesktop && (
                <div className="flex items-center gap-4">
                  <SortSelect value={search.sort} onChange={(sort) => void update({ sort })} />
                  {!hasSidebar && (
                    <FiltersSheet
                      {...sheetProps}
                      withSort={false}
                      trigger={
                        <Button type="button" variant="outline" size="sm" aria-label={filterLabel} className="h-9 gap-2 px-3 text-sm">
                          <SlidersHorizontal aria-hidden="true" />
                          Filtros
                          {activeCount > 0 && <span aria-hidden="true">({activeCount})</span>}
                        </Button>
                      }
                    />
                  )}
                </div>
              )
            }
          >
            {hasRefinements(search) && (
              <div className="mt-4 md:mt-6">
                <ActiveFilters search={search} total={data?.total} onChange={update} onClear={clearFilters} />
              </div>
            )}
            <CatalogResults query={list} page={search.page ?? 1} canClear={filtersActive} onClear={clearFilters} />
          </CatalogTabs>
          {!hasSidebar && <FeaturedBanner variant="wide" className="mt-12" />}
        </div>
      </section>

      <div className="mt-16 md:mt-24">
        <Promos />
      </div>
      <div className="mt-16 md:mt-24">
        <Blog />
      </div>
    </div>
  )
}
