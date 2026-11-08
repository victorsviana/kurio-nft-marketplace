import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { Button } from '@/components/ui/button'
import { CATALOG_PAGE_SIZE, type NftListResponse } from '@/shared/contracts'
import { useFavoriteToggle } from '@/shared/favorites/use-favorite-toggle'
import { cn } from '@/lib/utils'
import { CatalogPagination } from './catalog-pagination'
import { NftCard, NftCardSkeleton } from './nft-card'

/* Grid geometry from the Figma: 2 staggered columns on mobile (right column 32px lower),
 * 3 columns of 258 with 72px between rows on desktop. */
const gridClass =
  'grid grid-cols-2 gap-x-4 gap-y-6 pb-8 md:grid-cols-3 md:gap-x-6 md:gap-y-[72px] md:pb-0 xl:gap-x-[34px]'
const staggerClass = 'max-md:even:translate-y-8'

/**
 * Catalog grid with every data state (GEN-05, GEN-06, CAT-07):
 * - first load: skeleton cards with the card's exact geometry;
 * - failure without data: ErrorState + "Tentar novamente" (refetch);
 * - `total === 0`: EmptyState + "Limpar filtros";
 * - new params loading: the previous page stays (keepPreviousData), dimmed, `aria-busy`.
 */
export function CatalogResults({
  query,
  page,
  canClear,
  onClear,
}: {
  query: UseQueryResult<NftListResponse>
  page: number
  canClear: boolean
  onClear: () => void
}) {
  const { data, isError, isFetching, isPlaceholderData, error, refetch } = query
  const favorite = useFavoriteToggle()

  if (!data) {
    if (isError && !isFetching) {
      return <ErrorState error={error} onRetry={() => void refetch()} title="Não foi possível carregar o catálogo" className="mt-8" />
    }
    return <ResultsSkeleton />
  }

  if (data.total === 0) {
    return (
      <EmptyState
        className="mt-4 md:mt-8"
        title="Nenhum NFT encontrado"
        description={
          canClear
            ? 'Nenhum resultado para essa combinação de busca e filtros. Ajuste os filtros ou limpe tudo para ver o catálogo completo.'
            : 'Ainda não há NFTs listados no catálogo. Volte em breve.'
        }
        action={
          canClear ? (
            <Button type="button" onClick={onClear} className="mt-1">
              Limpar filtros
            </Button>
          ) : undefined
        }
      />
    )
  }

  if (data.items.length === 0) {
    return (
      <EmptyState
        className="mt-4 md:mt-8"
        title="Esta página não existe"
        description={`O catálogo tem ${data.totalPages} ${data.totalPages === 1 ? 'página' : 'páginas'} para essa busca.`}
        action={
          <Button asChild className="mt-1">
            <Link to="/" search={(prev) => ({ ...prev, page: undefined })} resetScroll={false}>
              Ir para a página 1
            </Link>
          </Button>
        }
      />
    )
  }

  const updating = isFetching
  return (
    <div
      aria-busy={updating}
      data-testid="catalog-results"
      className="relative mt-4 flex flex-col gap-8 md:mt-7 md:gap-22"
    >
      {isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-line-soft bg-surface px-4 py-3 text-sm">
          <span className="text-fg-muted">Não foi possível atualizar os resultados.</span>
          <button type="button" onClick={() => void refetch()} className="font-bold text-brand-text hover:underline">
            Tentar novamente
          </button>
        </div>
      )}
      {updating && (
        <p className="absolute -top-4 right-0 flex items-center gap-1.5 text-xs text-fg-muted md:-top-6" data-testid="catalog-updating">
          <RefreshCw aria-hidden="true" className="size-3 animate-spin motion-reduce:animate-none" />
          Atualizando…
        </p>
      )}
      <ul className={cn(gridClass, 'transition-opacity', isPlaceholderData && 'opacity-50')} data-testid="catalog-grid">
        {data.items.map((nft, index) => (
          <li key={nft.id} className={staggerClass}>
            <NftCard nft={nft} column={index % 2 === 0 ? 0 : 1} favorite={favorite} />
          </li>
        ))}
      </ul>
      <CatalogPagination page={page} totalPages={data.totalPages} />
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <div className="mt-4 md:mt-7" data-testid="catalog-skeleton">
      <p role="status" className="sr-only">
        Carregando NFTs…
      </p>
      <ul className={gridClass} aria-hidden="true">
        {Array.from({ length: CATALOG_PAGE_SIZE }, (_, index) => (
          <li key={index} className={staggerClass}>
            <NftCardSkeleton column={index % 2 === 0 ? 0 : 1} />
          </li>
        ))}
      </ul>
    </div>
  )
}
