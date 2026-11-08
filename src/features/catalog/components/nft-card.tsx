import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { NftImage } from '@/components/nft/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { NftSummary, Rarity } from '@/shared/contracts'
import { formatEth } from '@/shared/lib/format'
import favIdle from '../assets/fav-idle.svg'

const RARITY_BADGE: Partial<Record<Rarity, string>> = { rare: 'RARO', legendary: 'LENDÁRIO' }

/**
 * Card sizes from the Figma. Below md it is the Mobile / Início card (175 × 200 gradient box,
 * art 168, staggered right column); from md on it is the desktop card (258 × 300 box, art
 * 250 r15). Both are fluid so the grid never overflows between breakpoints.
 */
const boxClass =
  'relative flex aspect-[175/200] w-full items-start justify-center overflow-hidden rounded-[20px] bg-[linear-gradient(139.5deg,#241612_12%,#2f1d15_106.6%)] px-1 md:aspect-[258/300] md:items-center md:rounded-none md:bg-surface md:bg-none md:py-0'
const artClass = 'aspect-square w-full rounded-2xl md:rounded-[15px]'

export interface FavoriteControl {
  isFavorite: (nftId: string) => boolean
  toggle: (nftId: string, name?: string) => void
}

export function NftCard({ nft, column, favorite }: { nft: NftSummary; column: 0 | 1; favorite: FavoriteControl }) {
  const badge = RARITY_BADGE[nft.rarity]
  const isFavorite = favorite.isFavorite(nft.id)
  const soldOut = nft.available === 0

  return (
    <article className="relative flex flex-col gap-2 md:gap-3" data-testid="nft-card">
      <div className={cn(boxClass, column === 0 ? 'pt-3 pb-5' : 'pt-5 pb-3')}>
        <div className="relative w-full">
          <NftImage
            src={nft.image}
            alt={`Arte do NFT ${nft.name}`}
            width={250}
            height={250}
            sizes="(min-width: 1280px) 250px, (min-width: 768px) 30vw, 45vw"
            className={artClass}
          />
          <button
            type="button"
            onClick={() => favorite.toggle(nft.id, nft.name)}
            aria-pressed={isFavorite}
            aria-label={`Favoritar ${nft.name}`}
            className="absolute top-1.5 right-1.5 z-10 grid size-7 place-items-center rounded-full after:absolute after:-inset-2 md:hidden"
          >
            {isFavorite ? (
              <span className="grid size-7 place-items-center rounded-full border border-line bg-[#2f1d15]">
                <Heart aria-hidden="true" className="size-[15px] fill-brand text-brand" strokeWidth={1.5} />
              </span>
            ) : (
              <img src={favIdle} alt="" width={28} height={28} />
            )}
          </button>
        </div>
        {badge && (
          <span className="absolute top-4 left-0 h-8 min-w-[68px] bg-brand pr-3 pl-2 text-[13px] leading-8 font-medium text-ink">
            {badge}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col pl-2 md:gap-2 md:pl-0">
        <h3 className="truncate text-[15px] leading-5 font-normal text-fg md:text-base md:leading-4">
          {/* Stretched link: the whole card is clickable, the accessible name stays the NFT name (CAT-09). */}
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="outline-none after:absolute after:inset-0 after:z-[1] after:rounded-[20px] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring md:after:rounded-none"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-3 text-base leading-4 font-bold text-brand-text md:text-lg md:leading-4">
          <span className="sr-only">Preço:</span>
          <span>{formatEth(nft.price)}</span>
          {nft.compareAtPrice && (
            <s className="font-normal text-fg-subtle">
              <span className="sr-only">preço anterior:</span>
              {formatEth(nft.compareAtPrice)}
            </s>
          )}
          {soldOut && <span className="text-sm font-medium text-fg-muted">Esgotado</span>}
        </p>
      </div>
    </article>
  )
}

export function NftCardSkeleton({ column }: { column: 0 | 1 }) {
  return (
    <div className="flex flex-col gap-2 md:gap-3">
      <div className={cn(boxClass, column === 0 ? 'pt-3 pb-5' : 'pt-5 pb-3')}>
        <Skeleton className={cn(artClass, 'bg-line/40')} />
      </div>
      <div className="flex flex-col gap-1 pl-2 md:gap-2 md:pl-0">
        <Skeleton className="h-5 w-3/4 md:h-4" />
        <Skeleton className="h-4 w-2/5" />
      </div>
    </div>
  )
}
