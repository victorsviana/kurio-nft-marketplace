import { Link } from '@tanstack/react-router'
import { Heart, Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { Button } from '@/components/ui/button'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { cn } from '@/lib/utils'
import { useFavoriteToggle } from '@/shared/favorites/use-favorite-toggle'

/* Same geometry as the catalog grid (no Figma frame for this screen). */
const gridClass = 'grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-x-6 md:gap-y-[72px] lg:grid-cols-4 xl:gap-x-[34px]'
const staggerClass = 'max-md:even:translate-y-8'

/**
 * `/favorites` (FAV-01, FAV-02). Private route. Hearts use the optimistic toggle with per-NFT
 * rollback; un-favoriting here removes the card immediately (the hook filters `items`).
 * Data states (GEN-05, GEN-06): skeleton grid, empty, error with retry, background refresh.
 */
export function FavoritesScreen() {
  const favorite = useFavoriteToggle()
  const { favorites } = favorite
  const items = favorites.data?.items

  useEffect(() => {
    const previous = document.title
    document.title = 'Favoritos | Kurio'
    return () => {
      document.title = previous
    }
  }, [])

  let content
  if (items) {
    content =
      items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Você ainda não favoritou nenhum NFT"
          description="Toque no coração de um NFT para guardá-lo aqui."
          action={
            <Button asChild className="mt-1">
              <Link to="/" hash="catalogo">
                Explorar o mercado
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className={cn(gridClass, 'mt-6 pb-8 md:mt-8 md:pb-0')} aria-label="NFTs favoritos" data-testid="favorites-grid">
          {items.map((nft, index) => (
            <li key={nft.id} className={cn('relative', staggerClass)}>
              <NftCard nft={nft} column={(index % 2) as 0 | 1} favorite={favorite} />
              {/* The catalog card shows its heart only on mobile; desktop gets the same control here. */}
              <button
                type="button"
                onClick={() => favorite.toggle(nft.id, nft.name)}
                aria-pressed={favorite.isFavorite(nft.id)}
                aria-label={`Favoritar ${nft.name}`}
                className="absolute top-3 right-3 z-10 hidden size-9 place-items-center rounded-full border border-line bg-surface-raised transition-colors hover:border-brand md:grid"
              >
                <Heart
                  aria-hidden="true"
                  className={cn('size-[18px] text-brand', favorite.isFavorite(nft.id) && 'fill-brand')}
                  strokeWidth={1.75}
                />
              </button>
            </li>
          ))}
        </ul>
      )
  } else if (favorites.isError) {
    content = (
      <ErrorState
        className="mt-6"
        error={favorites.error}
        title="Não foi possível carregar seus favoritos"
        onRetry={() => void favorites.refetch()}
      />
    )
  } else {
    content = (
      <div role="status" aria-busy="true" data-testid="favorites-skeleton">
        <span className="sr-only">Carregando favoritos…</span>
        <div className={cn(gridClass, 'mt-6 md:mt-8')} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={staggerClass}>
              <NftCardSkeleton column={(i % 2) as 0 | 1} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className="container-page pt-8 pb-16 md:pt-10 md:pb-24" aria-labelledby="favorites-title">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 id="favorites-title" className="text-2xl leading-8 font-bold text-fg md:text-[28px]">
          Favoritos
          {items && items.length > 0 && (
            <span className="ml-3 text-base font-normal text-fg-muted">
              {items.length} {items.length === 1 ? 'NFT' : 'NFTs'}
            </span>
          )}
        </h1>
        {favorites.data && favorites.isRefetchError ? (
          <p className="flex items-center gap-2 text-xs text-fg-muted">
            Não foi possível atualizar.
            <button type="button" onClick={() => void favorites.refetch()} className="text-brand-text underline underline-offset-2">
              Tentar novamente
            </button>
          </p>
        ) : (
          <span
            aria-hidden="true"
            className={cn(
              'flex items-center gap-1.5 text-xs text-fg-subtle transition-opacity',
              favorites.data && favorites.isRefetching ? 'opacity-100 delay-500' : 'opacity-0 delay-0',
            )}
          >
            <Loader2 className="size-3.5 animate-spin" /> Atualizando…
          </span>
        )}
      </div>
      {content}
    </section>
  )
}
