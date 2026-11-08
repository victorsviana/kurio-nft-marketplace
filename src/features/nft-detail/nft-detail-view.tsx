import { Link } from '@tanstack/react-router'
import { Heart, Loader2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { MaskIcon } from '@/components/ui/mask-icon'
import { cn } from '@/lib/utils'
import type { NftDetail } from '@/shared/contracts'
import { useFavoriteToggle } from '@/shared/favorites/use-favorite-toggle'
import { formatEth } from '@/shared/lib/format'
import iconHeart from './assets/icon-heart.svg'
import iconStar from './assets/icon-star.svg'
import { DesktopGallery } from './components/desktop-gallery'
import { DetailTabs, type DetailTab } from './components/detail-tabs'
import { EditionPicker } from './components/edition-picker'
import { MobileBuyBar } from './components/mobile-buy-bar'
import { MobileHero } from './components/mobile-hero'
import { PriceUpdatedChip } from './components/price-updated-chip'
import { PurchaseNotice } from './components/purchase-notice'
import { QuantityStepper } from './components/quantity-stepper'
import { RatingStars } from './components/rating-stars'
import { RelatedSection } from './components/related-section'
import { ShareLinks } from './components/share-links'
import { TokenMeta } from './components/token-meta'
import { formatRating, reviewsLabel } from './lib/editions'
import { usePurchase, type PurchaseState } from './use-purchase'

export interface BackgroundStatus {
  refreshing: boolean
  /** A background refetch failed while older data is still on screen. */
  stale: boolean
  onRetry: () => void
}

/**
 * Loaded detail screen. Mounted with `key={nftId}`, so moving to another NFT (related cards)
 * starts from a clean selection: default edition, quantity 1, first image, details tab.
 */
export function NftDetailView({
  nft,
  desktop,
  background,
}: {
  nft: NftDetail
  desktop: boolean
  background: BackgroundStatus
}) {
  const purchase = usePurchase(nft)
  const favorites = useFavoriteToggle()
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [tab, setTab] = useState<DetailTab>('details')

  useEffect(() => {
    const previous = document.title
    document.title = `${nft.name} | Kurio`
    return () => {
      document.title = previous
    }
  }, [nft.name])

  const shared = {
    nft,
    purchase,
    galleryIndex,
    setGalleryIndex,
    tab,
    setTab,
    favorite: favorites.isFavorite(nft.id),
    toggleFavorite: () => favorites.toggle(nft.id),
    openReviews: () => {
      setTab('reviews')
      document.getElementById('nft-tabs')?.scrollIntoView({ block: 'start' })
    },
    background,
  }
  return desktop ? <DesktopDetail {...shared} /> : <MobileDetail {...shared} />
}

interface CompositionProps {
  nft: NftDetail
  purchase: PurchaseState
  galleryIndex: number
  setGalleryIndex: (index: number) => void
  tab: DetailTab
  setTab: (tab: DetailTab) => void
  favorite: boolean
  toggleFavorite: () => void
  openReviews: () => void
  background: BackgroundStatus
}

/* ------------------------------------ Desktop (≥ 768) ------------------------------------ */

function DesktopDetail({
  nft,
  purchase,
  galleryIndex,
  setGalleryIndex,
  tab,
  setTab,
  favorite,
  toggleFavorite,
  openReviews,
  background,
}: CompositionProps) {
  const noticeId = useId()
  const hasNotice = Boolean(purchase.feedback || purchase.blockedReason)

  return (
    <article aria-labelledby="nft-title">
      <div className="container-page pt-6">
        <div className="flex items-center justify-between gap-4">
          <nav aria-label="Trilha de navegação">
            <ol className="flex items-center gap-2 text-[15px] leading-4 font-bold text-fg">
              <li>
                <Link to="/" className="hover:text-brand-text">
                  Início
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link to="/" hash="catalogo" className="hover:text-brand-text">
                  Mercado
                </Link>
              </li>
            </ol>
          </nav>
          <BackgroundIndicator status={background} />
        </div>

        <div className="mt-3 flex flex-col gap-8 xl:flex-row">
          <DesktopGallery name={nft.name} images={nft.images} index={galleryIndex} onIndexChange={setGalleryIndex} />

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 xl:min-h-[448px]">
            <div>
              <h1 id="nft-title" className="text-[28px] leading-[37px] font-bold text-fg">
                {nft.name}
              </h1>
              <div className="mt-3 flex min-h-5 flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <div className="flex items-center gap-3">
                  <p data-testid="nft-price" className="text-[22px] leading-4 font-bold text-brand-text">
                    <span className="sr-only">Preço: </span>
                    {formatEth(purchase.edition.price)}
                  </p>
                  {purchase.priceRecentlyChanged && <PriceUpdatedChip />}
                </div>
                <div className="flex items-center gap-2">
                  <RatingStars rating={nft.rating} size={14} />
                  <button
                    type="button"
                    onClick={openReviews}
                    className="text-[15px] leading-4 text-fg transition-colors hover:text-brand-text"
                  >
                    {reviewsLabel(nft.reviewsCount)}
                  </button>
                </div>
              </div>
              <div aria-hidden="true" className="mt-3 h-px bg-brand/30 xl:max-w-[573px]" />
            </div>

            <section aria-labelledby="nft-about">
              <h2 id="nft-about" className="text-[15px] leading-4 font-bold text-fg">
                Sobre este NFT:
              </h2>
              <p className="mt-3 max-w-[574px] text-sm leading-6 text-fg-muted">{nft.description}</p>
            </section>

            <EditionPicker editions={nft.editions} value={purchase.editionId} onChange={purchase.selectEdition} />

            <div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <QuantityStepper
                  size="lg"
                  quantity={purchase.quantity}
                  max={purchase.max}
                  onIncrement={purchase.increment}
                  onDecrement={purchase.decrement}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={purchase.buy}
                    aria-disabled={!purchase.canBuy}
                    aria-busy={purchase.pending}
                    aria-describedby={hasNotice ? noticeId : undefined}
                    className="h-10 w-[130px] px-2 text-sm leading-5 font-bold aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-brand"
                  >
                    {purchase.pending && <Loader2 aria-hidden="true" className="animate-spin" />}
                    COMPRAR
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={toggleFavorite}
                    aria-pressed={favorite}
                    className="h-10 w-[130px] gap-2 px-2 text-sm leading-5 font-medium"
                  >
                    {favorite ? (
                      <Heart aria-hidden="true" className="size-5 fill-brand text-brand" />
                    ) : (
                      <MaskIcon src={iconHeart} width={20} height={20} className="text-brand" />
                    )}
                    Favoritar
                  </Button>
                </div>
              </div>
              <PurchaseNotice
                id={noticeId}
                feedback={purchase.feedback}
                blockedReason={purchase.blockedReason}
                className="mt-3"
              />
            </div>

            <TokenMeta nft={nft} />
            <ShareLinks nftId={nft.id} name={nft.name} collection={nft.collection} />
          </div>
        </div>
      </div>

      <DetailTabs nft={nft} value={tab} onValueChange={setTab} className="container-page mt-24" />
      <RelatedSection nftId={nft.id} className="container-page mt-24" />
    </article>
  )
}

/* ------------------------------------- Mobile (< 768) ------------------------------------- */

function MobileDetail({
  nft,
  purchase,
  galleryIndex,
  setGalleryIndex,
  tab,
  setTab,
  favorite,
  toggleFavorite,
  openReviews,
}: CompositionProps) {
  return (
    <article aria-labelledby="nft-title">
      <MobileHero
        name={nft.name}
        images={nft.images}
        index={galleryIndex}
        onIndexChange={setGalleryIndex}
        favorite={favorite}
        onToggleFavorite={toggleFavorite}
      />

      <div className="relative z-10 -mt-[30px] flex flex-col gap-3 rounded-t-[31px] bg-surface px-6 pt-8 pb-6">
        <div className="flex items-start justify-between gap-3">
          <h1 id="nft-title" className="pt-1 text-xl leading-5 font-bold text-fg">
            {nft.name}
          </h1>
          <button
            type="button"
            onClick={openReviews}
            aria-label={`Nota ${formatRating(nft.rating)} de 5, ${reviewsLabel(nft.reviewsCount)}. Ver avaliações`}
            className="flex h-[27px] shrink-0 items-center gap-1 rounded-[32px] border border-brand px-2 text-sm leading-4"
          >
            <MaskIcon src={iconStar} width={14} height={13.3} className="text-brand" />
            <span>
              <span className="font-medium text-fg">{formatRating(nft.rating)}</span>
              <span className="text-fg-muted">({nft.reviewsCount})</span>
            </span>
          </button>
        </div>
        <p className="text-sm leading-6 text-fg-muted">{nft.description}</p>
        <EditionPicker editions={nft.editions} value={purchase.editionId} onChange={purchase.selectEdition} compact />
        <TokenMeta nft={nft} />
      </div>

      <div className="flex flex-col gap-12 px-6 pt-10">
        <DetailTabs nft={nft} value={tab} onValueChange={setTab} />
        <RelatedSection nftId={nft.id} />
      </div>

      <MobileBuyBar purchase={purchase} />
    </article>
  )
}

function BackgroundIndicator({ status }: { status: BackgroundStatus }) {
  if (status.stale) {
    return (
      <p className="flex items-center gap-2 text-xs text-fg-muted">
        Não foi possível atualizar os dados.
        <button type="button" onClick={status.onRetry} className="text-brand-text underline underline-offset-2">
          Tentar novamente
        </button>
      </p>
    )
  }
  // Only shows up when a background refetch takes longer than ~0.5s (no flicker on fast ones).
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex items-center gap-1.5 text-xs text-fg-subtle transition-opacity',
        status.refreshing ? 'opacity-100 delay-500' : 'opacity-0 delay-0',
      )}
    >
      <Loader2 className="size-3.5 animate-spin" /> Atualizando…
    </span>
  )
}
