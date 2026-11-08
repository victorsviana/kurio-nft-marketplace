import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useId } from 'react'
import { NftImage } from '@/components/nft/nft-image'
import { MaskIcon } from '@/components/ui/mask-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { featuredQuery } from '@/shared/api/endpoints/nfts'
import { formatEth } from '@/shared/lib/format'
import iconArrow from '../assets/icon-arrow-right-accent.svg'

const gradient = 'bg-[linear-gradient(180deg,rgba(210,138,76,0.10)_0%,rgba(210,138,76,0.03)_100%)]'

/**
 * "Featured NFT Banner" (310 × 470 in the desktop sidebar) with the spotlight NFT from
 * `GET /nfts/featured` (CAT-01); links to its detail page. Below lg, where the sidebar is a
 * Sheet, the same content renders as a wide card after the grid.
 */
export function FeaturedBanner({ variant, className }: { variant: 'sidebar' | 'wide'; className?: string }) {
  const titleId = useId()
  const { data, isPending, isError } = useQuery(featuredQuery())
  if (isError) return null
  const spotlight = data?.spotlight

  if (variant === 'sidebar') {
    return (
      <section aria-labelledby={titleId} className={cn('relative flex flex-col overflow-hidden pt-6', gradient, className)}>
        <Decorations />
        <h2 id={titleId} className="relative px-5 text-2xl leading-8 font-bold text-brand-text">
          NFT EM DESTAQUE
        </h2>
        <p className="relative mt-2.5 text-center text-[22px] leading-[30px] font-bold text-fg">OFERTA LIMITADA</p>
        {isPending || !spotlight ? (
          <Skeleton className="relative mt-2 h-[368px] w-full rounded-[22px]" />
        ) : (
          <Link
            to="/nft/$nftId"
            params={{ nftId: spotlight.id }}
            aria-label={`Ver ${spotlight.name}, NFT em destaque por ${formatEth(spotlight.price)}`}
            className="group relative mt-2 block overflow-hidden rounded-[22px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <NftImage
              src={spotlight.image}
              alt={`Arte do NFT ${spotlight.name}`}
              width={310}
              height={368}
              sizes="310px"
              className="h-[368px] w-full rounded-[22px] transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </Link>
        )}
      </section>
    )
  }

  return (
    <section
      aria-labelledby={titleId}
      className={cn('relative flex items-center gap-4 overflow-hidden rounded-[22px] p-4 md:gap-8 md:p-6', gradient, className)}
    >
      <div className="relative flex min-w-0 flex-1 flex-col gap-1.5 md:gap-2">
        <h2 id={titleId} className="text-base leading-6 font-bold text-brand-text md:text-2xl md:leading-8">
          NFT EM DESTAQUE
        </h2>
        <p className="text-sm leading-5 font-bold text-fg md:text-[22px] md:leading-[30px]">OFERTA LIMITADA</p>
        {spotlight ? (
          <>
            <p className="mt-1 truncate text-sm text-fg-muted md:text-base">{spotlight.name}</p>
            <p className="text-base leading-4 font-bold text-brand-text md:text-lg">{formatEth(spotlight.price)}</p>
            <Link
              to="/nft/$nftId"
              params={{ nftId: spotlight.id }}
              className="mt-2 flex items-center gap-2 self-start rounded-sm text-xs leading-[14px] font-bold text-brand-text after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:text-sm"
            >
              VER NFT <span className="sr-only">{spotlight.name}</span>
              <MaskIcon src={iconArrow} width={10} height={12} className="-rotate-90" />
            </Link>
          </>
        ) : (
          <div className="mt-1 flex flex-col gap-2" aria-hidden="true">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        )}
      </div>
      {spotlight ? (
        <NftImage
          src={spotlight.image}
          alt={`Arte do NFT ${spotlight.name}`}
          width={220}
          height={260}
          sizes="(min-width: 768px) 220px, 132px"
          className="relative h-[156px] w-[132px] shrink-0 rounded-[18px] md:h-[260px] md:w-[220px] md:rounded-[22px]"
        />
      ) : (
        <Skeleton className="h-[156px] w-[132px] shrink-0 rounded-[18px] md:h-[260px] md:w-[220px]" />
      )}
    </section>
  )
}

/** Faint decorations of the Figma banner: a green outlined square and Primary gradient circles. */
function Decorations() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span className="absolute top-[100px] left-[38px] size-4 rounded-full bg-[linear-gradient(180deg,rgba(210,138,76,0.3),rgba(210,138,76,0))]" />
      <span className="absolute top-[300px] left-[16px] size-[22px] rounded-[4px] border-2 border-[#46a358] opacity-20" />
      <span className="absolute right-[4px] bottom-[110px] size-[40px] rounded-full bg-[linear-gradient(180deg,rgba(210,138,76,0.3),rgba(210,138,76,0))]" />
    </div>
  )
}
