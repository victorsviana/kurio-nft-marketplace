import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { CatalogFacets, CatalogSearch } from '@/shared/contracts'
import { hasActiveFilters } from '../lib/search'
import type { CatalogFilterPatch } from '../use-catalog-search'
import { FiltersPanel } from './filters-panel'
import { SortRadioGroup } from './sort-control'

/**
 * Filters drawer for mobile and tablet (not drawn in the Figma: it reuses the sidebar look).
 * Radix Dialog underneath: focus is trapped and returned to the trigger, Esc closes (A11Y-02).
 * Changes apply immediately to the URL, so the grid behind updates while it is open.
 */
export function FiltersSheet({
  trigger,
  search,
  facets,
  facetsLoading,
  total,
  updating,
  withSort,
  onChange,
  onClear,
}: {
  trigger: ReactNode
  search: CatalogSearch
  facets: CatalogFacets | undefined
  facetsLoading: boolean
  total: number | undefined
  updating: boolean
  withSort: boolean
  onChange: (patch: CatalogFilterPatch) => void
  onClear: () => void
}) {
  const resultsLabel =
    updating || total === undefined ? 'Ver resultados' : `Ver ${total} ${total === 1 ? 'resultado' : 'resultados'}`
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="gap-0 border-line bg-surface p-0 data-[side=right]:w-[min(100%,360px)] data-[side=right]:sm:max-w-[360px]"
      >
        <SheetHeader className="flex-row items-center justify-between border-b border-line px-5 py-4">
          <SheetTitle className="text-lg font-bold text-fg">Filtros</SheetTitle>
          <SheetClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Fechar filtros" className="text-fg">
              <X aria-hidden="true" />
            </Button>
          </SheetClose>
        </SheetHeader>
        <SheetDescription className="sr-only">
          Refine o catálogo por coleção, faixa de preço e rede. Cada mudança atualiza os resultados.
        </SheetDescription>
        <div className="flex-1 overflow-y-auto">
          {withSort && <SortRadioGroup value={search.sort} onChange={(sort) => onChange({ sort })} />}
          <FiltersPanel search={search} facets={facets} facetsLoading={facetsLoading} onChange={onChange} />
        </div>
        <div className="grid auto-cols-fr grid-flow-col gap-3 border-t border-line px-5 py-4">
          {hasActiveFilters(search) && (
            <Button type="button" variant="outline" onClick={onClear} className="min-w-0 px-2 text-sm">
              Limpar filtros
            </Button>
          )}
          <SheetClose asChild>
            <Button type="button" className="min-w-0 px-2 text-sm">
              {resultsLabel}
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}
