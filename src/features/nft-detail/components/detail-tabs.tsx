import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { NftDetail } from '@/shared/contracts'
import { formatDate, shortAddress } from '@/shared/lib/format'
import { formatRating, reviewsLabel } from '../lib/editions'
import { RatingStars } from './rating-stars'

export type DetailTab = 'details' | 'reviews'

/** shadcn Tabs restyled as the Figma underline tabs (17px, active bold Text/Accent + 3px rule). */
const triggerClass = cn(
  'h-auto flex-none justify-start rounded-none border-0 pt-0 pr-2 pb-3 pl-0 text-[17px] leading-4 font-normal text-fg',
  'hover:text-brand-text data-active:bg-transparent data-active:font-bold data-active:text-brand-text',
  'after:bg-brand group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-[3px]',
  'max-md:text-[15px]',
)

const REVIEWS_PAGE = 5

/** "Detalhes do NFT" / "Avaliações de colecionadores (N)" (NFT-01). */
export function DetailTabs({
  nft,
  value,
  onValueChange,
  className,
}: {
  nft: NftDetail
  value: DetailTab
  onValueChange: (tab: DetailTab) => void
  className?: string
}) {
  return (
    <section id="nft-tabs" aria-label="Informações do NFT" className={cn('scroll-mt-6', className)}>
      <Tabs value={value} onValueChange={(v) => onValueChange(v as DetailTab)} className="gap-3">
        <TabsList
          variant="line"
          className="w-full justify-start gap-8 rounded-none border-b border-brand/30 p-0 group-data-horizontal/tabs:h-auto max-md:gap-6"
        >
          <TabsTrigger value="details" className={triggerClass}>
            Detalhes do NFT
          </TabsTrigger>
          <TabsTrigger value="reviews" className={triggerClass}>
            Avaliações<span className="max-md:hidden"> de colecionadores</span> ({nft.reviewsCount})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="text-sm leading-6 text-fg-muted">
          <DetailsPanel nft={nft} />
        </TabsContent>
        <TabsContent value="reviews" className="text-sm leading-6 text-fg-muted">
          <ReviewsPanel nft={nft} />
        </TabsContent>
      </Tabs>
    </section>
  )
}

function DetailsPanel({ nft }: { nft: NftDetail }) {
  const groups = [
    { label: 'Rede:', value: nft.networkNote },
    {
      // The Figma swaps the "Contrato" and "Direitos autorais" labels; content follows the label here.
      label: 'Contrato:',
      value: (
        <>
          <span title={nft.contractAddress}>{shortAddress(nft.contractAddress)}</span> • Contrato inteligente{' '}
          {nft.tokenStandard} verificado.
        </>
      ),
    },
    {
      label: 'Direitos autorais:',
      value: `Direitos autorais do criador: ${nft.royaltyPercent}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.`,
    },
  ]
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-6">
        {nft.longDescription.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
      <dl className="flex flex-col gap-3">
        {groups.map((group) => (
          <div key={group.label}>
            <dt className="font-bold text-fg">{group.label}</dt>
            <dd>{group.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function ReviewsPanel({ nft }: { nft: NftDetail }) {
  const [visible, setVisible] = useState(REVIEWS_PAGE)
  if (nft.reviews.length === 0) {
    return <p>Este NFT ainda não recebeu avaliações de colecionadores.</p>
  }
  const shown = nft.reviews.slice(0, visible)
  return (
    <div className="flex flex-col gap-4">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-fg">
        <span className="text-[22px] leading-6 font-bold text-brand-text">{formatRating(nft.rating)}</span>
        <RatingStars rating={nft.rating} />
        <span className="text-fg-muted">{reviewsLabel(nft.reviewsCount)}</span>
      </p>
      <ul className="flex flex-col divide-y divide-line" aria-label="Avaliações">
        {shown.map((review) => (
          <li key={review.id} className="py-4 first:pt-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="font-bold text-fg">{review.author}</p>
              <RatingStars rating={review.rating} size={11} gap={3} />
              <time dateTime={review.createdAt} className="text-xs text-fg-subtle">
                {formatDate(review.createdAt)}
              </time>
            </div>
            <p className="mt-1">{review.comment}</p>
          </li>
        ))}
      </ul>
      {visible < nft.reviews.length && (
        <button
          type="button"
          onClick={() => setVisible((n) => n + REVIEWS_PAGE)}
          className="self-start rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:bg-brand/10"
        >
          Ver mais avaliações ({nft.reviews.length - visible} restantes)
        </button>
      )}
    </div>
  )
}
