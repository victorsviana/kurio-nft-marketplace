import { X } from 'lucide-react'
import { CATEGORIES, CATEGORY_LABELS, NETWORK_LABELS, NETWORKS, type CatalogSearch } from '@/shared/contracts'
import { formatEthPtBr } from '@/shared/lib/format'
import { csvValues, toggleCsv } from '../lib/search'
import type { CatalogFilterPatch } from '../use-catalog-search'

interface Chip {
  key: string
  label: string
  remove: CatalogFilterPatch
}

function chipsOf(search: CatalogSearch): Chip[] {
  const chips: Chip[] = []
  if (search.q) chips.push({ key: 'q', label: `Busca: “${search.q}”`, remove: { q: undefined } })
  for (const slug of CATEGORIES) {
    if (csvValues(search.category).includes(slug)) {
      chips.push({ key: `c-${slug}`, label: CATEGORY_LABELS[slug], remove: { category: toggleCsv(search.category, slug, CATEGORIES) } })
    }
  }
  for (const slug of NETWORKS) {
    if (csvValues(search.network).includes(slug)) {
      chips.push({ key: `n-${slug}`, label: NETWORK_LABELS[slug], remove: { network: toggleCsv(search.network, slug, NETWORKS) } })
    }
  }
  if (search.minPrice || search.maxPrice) {
    const from = search.minPrice ? formatEthPtBr(search.minPrice) : null
    const to = search.maxPrice ? formatEthPtBr(search.maxPrice) : null
    const label = from && to ? `${from} - ${to} ETH` : from ? `A partir de ${from} ETH` : `Até ${to} ETH`
    chips.push({ key: 'price', label, remove: { minPrice: undefined, maxPrice: undefined } })
  }
  return chips
}

/**
 * Active search term and filters as removable chips (the header search writes `?q=`), plus
 * the result count and "Limpar filtros". Hidden in the default state, so the Figma view is
 * unchanged.
 */
export function ActiveFilters({
  search,
  total,
  onChange,
  onClear,
}: {
  search: CatalogSearch
  total: number | undefined
  onChange: (patch: CatalogFilterPatch) => void
  onClear: () => void
}) {
  const chips = chipsOf(search)
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="active-filters">
      <ul className="contents" aria-label="Filtros ativos">
        {chips.map((chip) => (
          <li key={chip.key}>
            <button
              type="button"
              onClick={() => onChange(chip.remove)}
              aria-label={`Remover filtro ${chip.label}`}
              className="flex h-8 max-w-[240px] items-center gap-1.5 rounded-md border border-line-soft bg-surface px-2.5 text-fg hover:border-brand hover:text-brand-text"
            >
              <span className="truncate">{chip.label}</span>
              <X aria-hidden="true" className="size-3.5 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
      {total !== undefined && (
        <span className="px-1 text-fg-muted">
          {total} {total === 1 ? 'NFT' : 'NFTs'}
        </span>
      )}
      <button type="button" onClick={onClear} className="px-1 font-bold text-brand-text underline-offset-4 hover:underline">
        Limpar filtros
      </button>
    </div>
  )
}
