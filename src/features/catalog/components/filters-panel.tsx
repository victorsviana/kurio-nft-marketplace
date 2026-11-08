import { Check } from 'lucide-react'
import { useId } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  NETWORK_LABELS,
  NETWORKS,
  type CatalogFacets,
  type CatalogSearch,
  type FacetOption,
} from '@/shared/contracts'
import { csvValues, toggleCsv } from '../lib/search'
import type { CatalogFilterPatch } from '../use-catalog-search'
import { PriceRange } from './price-range'

const titleClass = 'text-lg leading-4 font-bold text-fg'

/**
 * One facet list ("Coleções", "Rede"). Each row is a real checkbox (transparent native
 * input stretched over the label), so it is keyboard operable and announced as checked/unchecked;
 * the row carries the visible focus ring. Selected rows use Text/Accent plus a check mark,
 * so the state does not depend on color alone (A11Y-05). Counts come from the API facets.
 */
function FacetList<T extends string>({
  title,
  options,
  labels,
  selected,
  counts,
  loading,
  onToggle,
  boldCounts,
  rowClassName,
}: {
  title: string
  options: readonly T[]
  labels: Record<T, string>
  selected: string[]
  counts: FacetOption[] | undefined
  loading: boolean
  onToggle: (value: T) => void
  boldCounts: boolean
  rowClassName: string
}) {
  const titleId = useId()
  return (
    <div role="group" aria-labelledby={titleId} className="flex flex-col gap-3">
      <h3 id={titleId} className={titleClass}>
        {title}
      </h3>
      <ul>
        {options.map((value) => {
          const checked = selected.includes(value)
          const count = counts?.find((c) => c.slug === value)?.count
          return (
            <li key={value}>
              <label
                className={cn(
                  'relative flex h-10 cursor-pointer items-center justify-between gap-3 rounded-sm text-[15px] leading-10 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                  checked ? 'text-brand-text' : 'text-fg-muted hover:text-fg',
                  count === 0 && !checked && 'opacity-60',
                  rowClassName,
                )}
              >
                {/* Invisible native checkbox covering the whole row: real semantics and a large hit area. */}
                <input
                  type="checkbox"
                  className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
                  checked={checked}
                  onChange={() => onToggle(value)}
                />
                {checked && <Check aria-hidden="true" className="pointer-events-none absolute -left-1 size-3" strokeWidth={3} />}
                <span className="truncate">{labels[value]}</span>
                {count === undefined ? (
                  loading && <Skeleton className="h-3.5 w-8" />
                ) : (
                  <>
                    <span aria-hidden="true" className={boldCounts ? 'font-bold' : 'font-normal'}>
                      ({count})
                    </span>
                    <span className="sr-only">, {count} NFTs</span>
                  </>
                )}
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** "Filters" component of the Figma: Coleções, Faixa de preço and Rede (CAT-03). */
export function FiltersPanel({
  search,
  facets,
  facetsLoading,
  onChange,
  className,
}: {
  search: CatalogSearch
  facets: CatalogFacets | undefined
  /** No response yet: counts and the price slider show skeletons. */
  facetsLoading: boolean
  onChange: (patch: CatalogFilterPatch) => void
  className?: string
}) {
  const priceTitleId = useId()
  return (
    <div className={cn('flex flex-col gap-10 p-5', className)}>
      <FacetList
        title="Coleções"
        options={CATEGORIES}
        labels={CATEGORY_LABELS}
        selected={csvValues(search.category)}
        counts={facets?.categories}
        loading={facetsLoading}
        onToggle={(value) => onChange({ category: toggleCsv(search.category, value, CATEGORIES) })}
        boldCounts
        rowClassName="px-3"
      />
      <div role="group" aria-labelledby={priceTitleId} className="flex flex-col gap-3">
        <h3 id={priceTitleId} className={titleClass}>
          Faixa de preço
        </h3>
        {facets ? (
          <PriceRange
            key={`${search.minPrice ?? ''}-${search.maxPrice ?? ''}`}
            range={facets.priceRange}
            minPrice={search.minPrice}
            maxPrice={search.maxPrice}
            onApply={onChange}
          />
        ) : facetsLoading ? (
          <div className="flex flex-col gap-3 pl-3" aria-hidden="true">
            <Skeleton className="h-[21px] w-full rounded-full" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-9 w-[86px]" />
          </div>
        ) : (
          <p className="pl-3 text-sm text-fg-muted">Faixa de preço indisponível.</p>
        )}
      </div>
      <FacetList
        title="Rede"
        options={NETWORKS}
        labels={NETWORK_LABELS}
        selected={csvValues(search.network)}
        counts={facets?.networks}
        loading={facetsLoading}
        onToggle={(value) => onChange({ network: toggleCsv(search.network, value, NETWORKS) })}
        boldCounts={false}
        rowClassName="pl-3"
      />
    </div>
  )
}
