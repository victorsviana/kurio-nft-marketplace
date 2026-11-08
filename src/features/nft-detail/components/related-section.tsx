import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { NftImage } from '@/components/nft/nft-image'
import { ErrorState } from '@/components/feedback/states'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { relatedQuery } from '@/shared/api/endpoints/nfts'
import type { NftSummary } from '@/shared/contracts'
import { formatEth } from '@/shared/lib/format'
import { useIsWide } from '../lib/use-media-query'

const PAGE_SIZE = 5

/** "Mais desta coleção": 5-card pages with dot buttons (lg+), scroll-snap row below. */
export function RelatedSection({ nftId, className }: { nftId: string; className?: string }) {
  const headingId = useId()
  const wide = useIsWide()
  const related = useQuery(relatedQuery(nftId))

  let content
  if (related.isPending) {
    content = <RelatedSkeleton wide={wide} />
  } else if (related.isError) {
    content = (
      <ErrorState
        error={related.error}
        title="Não foi possível carregar mais NFTs desta coleção"
        onRetry={() => void related.refetch()}
      />
    )
  } else if (related.data.items.length === 0) {
    content = <p className="text-sm text-fg-muted">Nenhum outro NFT desta coleção no momento.</p>
  } else if (wide) {
    content = <RelatedCarousel items={related.data.items} label={headingId} />
  } else {
    content = (
      <ul className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-1 [scrollbar-width:none] md:-mx-1 md:scroll-px-1 md:px-1 [&::-webkit-scrollbar]:hidden">
        {related.data.items.map((item) => (
          <li key={item.id} className="w-[160px] shrink-0 snap-start md:w-[200px]">
            <RelatedCard item={item} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section aria-labelledby={headingId} className={className} data-testid="related-section">
      <h2 id={headingId} className="text-[17px] leading-4 font-bold text-brand-text">
        Mais desta coleção
      </h2>
      <div aria-hidden="true" className="mt-3 h-px bg-brand/30" />
      <div className="mt-8">{content}</div>
    </section>
  )
}

function RelatedCarousel({ items, label }: { items: NftSummary[]; label: string }) {
  const [page, setPage] = useState(0)
  const dots = useRef<(HTMLButtonElement | null)[]>([])
  const pages = Array.from({ length: Math.ceil(items.length / PAGE_SIZE) }, (_, p) =>
    items.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE),
  )
  const current = Math.min(page, pages.length - 1)

  function onDotKey(event: KeyboardEvent<HTMLButtonElement>, p: number) {
    const delta = { ArrowRight: 1, ArrowLeft: -1 }[event.key]
    if (delta === undefined) return
    event.preventDefault()
    const next = (p + delta + pages.length) % pages.length
    setPage(next)
    dots.current[next]?.focus()
  }

  return (
    <div>
      {/* Padding keeps the cards' focus outline visible inside the clipping viewport. */}
      <div className="-m-1 overflow-hidden p-1">
        <div
          className="flex gap-8 transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(calc(${current} * -1 * (100% + 2rem)))` }}
        >
          {pages.map((pageItems, p) => (
            <ul
              key={p}
              inert={p !== current}
              aria-label={`Página ${p + 1} de ${pages.length}`}
              className="grid w-full shrink-0 grid-cols-5 gap-[26px]"
            >
              {pageItems.map((item) => (
                <li key={item.id}>
                  <RelatedCard item={item} />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      {pages.length > 1 && (
        <div role="group" aria-labelledby={label} className="mt-8 flex justify-center gap-2">
          {pages.map((_, p) => (
            <button
              key={p}
              ref={(el) => {
                dots.current[p] = el
              }}
              type="button"
              aria-label={`Página ${p + 1} de ${pages.length}`}
              aria-current={p === current ? 'true' : undefined}
              onClick={() => setPage(p)}
              onKeyDown={(event) => onDotKey(event, p)}
              className={cn(
                'relative size-3 rounded-full border-[1.3px] border-brand transition-colors after:absolute after:-inset-1.5 after:content-[""]',
                p === current ? 'bg-brand' : 'hover:bg-brand/30',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RelatedCard({ item }: { item: NftSummary }) {
  return (
    <Link
      to="/nft/$nftId"
      params={{ nftId: item.id }}
      className="group flex flex-col gap-3 rounded-sm"
      data-testid="related-card"
    >
      <div className="bg-surface px-1 pt-5 pb-6 transition-colors group-hover:bg-[#2F1D15]">
        <NftImage
          src={item.image}
          alt=""
          sizes="(min-width: 64rem) 211px, 200px"
          width={211}
          height={211}
          className="aspect-square w-full rounded-[13px]"
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="truncate text-[15px] leading-[18px] text-fg group-hover:text-brand-text">{item.name}</span>
        <span className="text-base leading-4 font-bold text-brand-text">{formatEth(item.price)}</span>
      </div>
    </Link>
  )
}

export function RelatedSkeleton({ wide }: { wide: boolean }) {
  const count = wide ? PAGE_SIZE : 3
  return (
    <div className={cn(wide ? 'grid grid-cols-5 gap-[26px]' : 'flex gap-4 overflow-hidden')}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn('flex flex-col gap-3', !wide && 'w-[160px] shrink-0 md:w-[200px]')}>
          <Skeleton className="aspect-[219/255] w-full rounded-none" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
