import { Link } from '@tanstack/react-router'
import { useId } from 'react'
import { NftImage } from '@/components/nft/nft-image'
import { MaskIcon } from '@/components/ui/mask-icon'
import { cn } from '@/lib/utils'
import type { CartItem, Quote } from '@/shared/contracts'
import { formatEth } from '@/shared/lib/format'
import iconDelete from '../assets/icon-delete.svg'
import iconMinus from '../assets/icon-minus.svg'
import iconPlus from '../assets/icon-plus.svg'
import { stockIssueFor } from '../lib/lines'
import { useCartLine } from '../use-cart-line'
import type { CartRealtimeNotices } from '../use-cart-realtime'
import { LineNotices } from './line-notices'

const headClass = 'pb-3 text-left text-base leading-4 text-fg border-b border-brand/30'

/**
 * Desktop cart table (Figma 11:1278): NFT · Preço · Edições · Total · remover. A real <table>
 * (column headers give each cell its context to screen readers); per-line notices go in a
 * full-width row right below the line.
 */
export function CartTable({
  items,
  quote,
  notices,
}: {
  items: CartItem[]
  quote: Quote | undefined
  notices: CartRealtimeNotices
}) {
  return (
    <table className="w-full table-fixed border-separate border-spacing-x-0 border-spacing-y-3" data-testid="cart-table">
      <caption className="sr-only">Itens do carrinho</caption>
      <colgroup>
        <col />
        <col className="w-[18%]" />
        <col className="w-[17%]" />
        <col className="w-[19%]" />
        <col className="w-12" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col" className={cn(headClass, 'font-bold')}>
            NFTs
          </th>
          <th scope="col" className={cn(headClass, 'font-medium')}>
            Preço
          </th>
          <th scope="col" className={cn(headClass, 'font-bold')}>
            Edições
          </th>
          <th scope="col" className={cn(headClass, 'font-medium')}>
            Total
          </th>
          <th scope="col" className={headClass}>
            <span className="sr-only">Ações</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <CartRow
            key={item.id}
            item={item}
            quote={quote}
            notice={notices.noticeFor(item)}
            onDismiss={() => notices.dismiss(item.id)}
          />
        ))}
      </tbody>
    </table>
  )
}

function CartRow({
  item,
  quote,
  notice,
  onDismiss,
}: {
  item: CartItem
  quote: Quote | undefined
  notice: ReturnType<CartRealtimeNotices['noticeFor']>
  onDismiss: () => void
}) {
  const line = useCartLine(item)
  const noticeId = useId()
  const limitId = useId()
  const issue = stockIssueFor(quote, item.id)
  const hasNotice = Boolean(line.error || issue || notice)

  return (
    <>
      <tr
        data-testid="cart-line"
        aria-busy={line.pending}
        aria-describedby={hasNotice ? noticeId : undefined}
        className={cn('[&>td]:h-[70px] [&>td]:bg-surface [&>td]:p-0', line.pending && 'opacity-70')}
      >
        <td>
          <div className="flex items-center gap-4">
            <NftImage
              src={item.image}
              alt=""
              width={70}
              height={70}
              sizes="70px"
              className="size-[70px] shrink-0 rounded-[6px]"
            />
            <div className="flex min-w-0 flex-col gap-1.5">
              <Link
                to="/nft/$nftId"
                params={{ nftId: item.nftId }}
                className="truncate text-base leading-4 font-bold text-fg hover:text-brand-text"
              >
                {item.name}
              </Link>
              <span className="truncate text-sm leading-4 text-fg-subtle">
                ID do token: #{item.tokenId}
                <span className="sr-only">, edição {item.editionLabel}</span>
              </span>
            </div>
          </div>
        </td>
        <td className="text-base leading-4 font-bold text-fg-muted" data-testid="cart-unit-price">
          {formatEth(item.unitPrice)}
        </td>
        <td>
          <div role="group" aria-label={`Quantidade de ${item.name}`} className="flex items-center gap-3">
            <StepButton
              icon={iconMinus}
              label={`Diminuir quantidade de ${item.name}`}
              disabled={!line.canDecrement}
              onClick={line.decrement}
            />
            <span data-testid="cart-quantity" className="min-w-[1.5ch] text-center text-[17px] leading-6 text-fg tabular-nums">
              {item.quantity}
            </span>
            <StepButton
              icon={iconPlus}
              label={`Aumentar quantidade de ${item.name}`}
              disabled={!line.canIncrement}
              describedBy={line.limitReason ? limitId : undefined}
              title={line.limitReason ?? undefined}
              onClick={line.increment}
            />
            {line.limitReason && (
              <span id={limitId} className="sr-only">
                {line.limitReason}
              </span>
            )}
          </div>
        </td>
        <td className="text-base leading-4 font-bold text-brand-text" data-testid="cart-line-total">
          {formatEth(item.lineTotal)}
        </td>
        <td className="pr-6 text-right">
          <button
            type="button"
            onClick={line.removeLine}
            aria-disabled={line.pending}
            aria-label={`Remover ${item.name} do carrinho`}
            className="relative inline-grid size-6 place-items-center text-fg-subtle transition-colors after:absolute after:-inset-2 hover:text-brand-text aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          >
            <MaskIcon src={iconDelete} width={17.65} height={19.98} />
          </button>
        </td>
      </tr>
      {hasNotice && (
        <tr>
          <td colSpan={5} className="p-0">
            <LineNotices id={noticeId} item={item} line={line} issue={issue} notice={notice} onDismiss={onDismiss} />
          </td>
        </tr>
      )}
    </>
  )
}

/** 20 × 30 Primary pill with black icon; bounds use aria-disabled so focus stays put. */
function StepButton({
  icon,
  label,
  disabled,
  onClick,
  describedBy,
  title,
}: {
  icon: string
  label: string
  disabled: boolean
  onClick: () => void
  describedBy?: string
  title?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled}
      aria-describedby={describedBy}
      title={title}
      onClick={onClick}
      className={cn(
        'relative grid h-[30px] w-5 shrink-0 place-items-center rounded-[20px] border border-ink bg-brand text-ink shadow-[0_4px_6px_rgba(20,13,10,0.15)] transition-colors',
        'after:absolute after:-inset-x-2 after:-inset-y-1.5 after:content-[""] hover:bg-brand-text',
        'aria-disabled:cursor-not-allowed aria-disabled:bg-line-soft aria-disabled:text-fg-subtle aria-disabled:hover:bg-line-soft',
      )}
    >
      <MaskIcon src={icon} width={16} height={16} />
    </button>
  )
}
