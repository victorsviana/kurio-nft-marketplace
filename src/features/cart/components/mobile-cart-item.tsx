import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useId } from 'react'
import { NftImage } from '@/components/nft/nft-image'
import { MaskIcon } from '@/components/ui/mask-icon'
import { cn } from '@/lib/utils'
import type { CartItem, Quote } from '@/shared/contracts'
import { formatEth } from '@/shared/lib/format'
import iconDelete from '../assets/icon-delete.svg'
import { stockIssueFor } from '../lib/lines'
import { useCartLine } from '../use-cart-line'
import type { CartRealtimeNotices } from '../use-cart-realtime'
import { LineNotices } from './line-notices'

const circle =
  'relative grid size-6 shrink-0 place-items-center rounded-full border border-line bg-surface-raised text-fg transition-colors after:absolute after:-inset-2.5 after:content-[""] hover:border-line-soft aria-disabled:cursor-not-allowed aria-disabled:border-line aria-disabled:text-line-soft'

/**
 * Mobile cart card (Figma 16:360): 100 px card, art on the left, name · "Edição: 1/50" · line
 * total, round stepper on the right. At quantity 1 the "−" becomes the remove action; above 1
 * a small trash button in the corner keeps removal one tap away.
 */
export function MobileCartItem({
  item,
  quote,
  notices,
}: {
  item: CartItem
  quote: Quote | undefined
  notices: CartRealtimeNotices
}) {
  const line = useCartLine(item)
  const noticeId = useId()
  const limitId = useId()
  const issue = stockIssueFor(quote, item.id)
  const notice = notices.noticeFor(item)
  const hasNotice = Boolean(line.error || issue || notice)
  const removeLabel = `Remover ${item.name} do carrinho`

  return (
    <li data-testid="cart-line" aria-busy={line.pending} aria-describedby={hasNotice ? noticeId : undefined}>
      <div
        className={cn(
          'relative flex h-[100px] overflow-hidden rounded-[14px] bg-surface shadow-[0_6px_20px_rgba(10,6,4,0.45)]',
          line.pending && 'opacity-70',
        )}
      >
        <NftImage
          src={item.image}
          alt=""
          width={100}
          height={100}
          sizes="100px"
          className="size-[100px] shrink-0 rounded-l-[14px]"
        />
        {/* Positions from the frame: text at left 109 (name 13, edition 35, total 69), stepper at top 38. */}
        <div className="flex min-w-0 flex-1 flex-col pt-[13px] pr-3 pl-[9px]">
          <Link
            to="/nft/$nftId"
            params={{ nftId: item.nftId }}
            className="truncate text-[15px] leading-4 font-bold text-fg after:absolute after:inset-0 after:content-['']"
          >
            {item.name}
          </Link>
          <span className="mt-1.5 truncate pr-[96px] text-sm leading-4 text-fg-muted">Edição: {item.editionLabel}</span>
          <span className="mt-auto pb-[15px] text-lg leading-4 font-bold text-brand-text" data-testid="cart-line-total">
            <span className="sr-only">Total: </span>
            {formatEth(item.lineTotal)}
          </span>
        </div>

        <div role="group" aria-label={`Quantidade de ${item.name}`} className="absolute top-[38px] right-3 z-10 flex items-center gap-2.5">
          {item.quantity > 1 ? (
            <button
              type="button"
              className={circle}
              aria-label={`Diminuir quantidade de ${item.name}`}
              aria-disabled={!line.canDecrement}
              onClick={line.decrement}
            >
              <span aria-hidden="true" className="h-0.5 w-[9px] bg-current" />
            </button>
          ) : (
            <button
              type="button"
              className={cn(circle, 'border-transparent bg-transparent text-brand')}
              aria-label={removeLabel}
              aria-disabled={line.pending}
              onClick={line.removeLine}
            >
              <MaskIcon src={iconDelete} width={15} height={17} />
            </button>
          )}
          <span data-testid="cart-quantity" className="min-w-[1.5ch] text-center text-base leading-[22px] text-fg tabular-nums">
            {item.quantity}
          </span>
          <button
            type="button"
            className={circle}
            aria-label={`Aumentar quantidade de ${item.name}`}
            aria-disabled={!line.canIncrement}
            aria-describedby={line.limitReason ? limitId : undefined}
            title={line.limitReason ?? undefined}
            onClick={line.increment}
          >
            <Plus aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
          </button>
          {line.limitReason && (
            <span id={limitId} className="sr-only">
              {line.limitReason}
            </span>
          )}
        </div>
        {item.quantity > 1 && (
          <button
            type="button"
            onClick={line.removeLine}
            aria-disabled={line.pending}
            aria-label={removeLabel}
            className="absolute right-3 bottom-2 z-10 grid size-6 place-items-center text-brand after:absolute after:-inset-1.5 aria-disabled:opacity-50"
          >
            <MaskIcon src={iconDelete} width={14} height={16} />
          </button>
        )}
      </div>
      <LineNotices
        id={noticeId}
        item={item}
        line={line}
        issue={issue}
        notice={notice}
        onDismiss={() => notices.dismiss(item.id)}
        className="mt-2 px-1"
      />
    </li>
  )
}
