import Big from 'big.js'
import { NftImage } from '@/components/nft/nft-image'
import { cn } from '@/lib/utils'
import type { Order } from '@/shared/contracts'
import { formatEth } from '@/shared/lib/format'

/**
 * "Detalhes da transação": the purchased lines and totals exactly as the order snapshot
 * carries them (ORD-05). Nothing is recomputed here (constitution §2.4); the discount line
 * only appears when the snapshot has one.
 */
export function OrderDetails({ order, headingId, title = 'Detalhes da transação' }: { order: Order; headingId: string; title?: string }) {
  const hasDiscount = new Big(order.discount).gt(0)
  return (
    <div className="flex flex-col gap-3">
      <h2 id={headingId} className="text-[15px] leading-4 font-bold text-fg">
        {title}
      </h2>
      <table aria-labelledby={headingId} className="w-full border-collapse text-left" data-testid="order-items">
        <thead>
          <tr className="border-b-[0.5px] border-brand">
            <th scope="col" className="pt-1 pb-2 text-sm leading-4 font-bold text-fg md:text-base">
              NFTs
            </th>
            <th scope="col" className="px-2 pt-1 pb-2 text-center text-sm leading-4 font-bold text-fg md:pr-6 md:pl-0 md:text-base">
              Edições
            </th>
            <th scope="col" className="pt-1 pb-2 text-right text-sm leading-4 font-medium text-fg md:text-base">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((line, index) => (
            <tr key={line.itemId} data-testid="order-line">
              <td className={cn('py-1.5 pr-2', index === 0 && 'pt-3')}>
                <div className="flex items-center gap-3">
                  <NftImage
                    src={line.image}
                    alt={line.name}
                    sizes="70px"
                    width={70}
                    height={70}
                    className="size-14 shrink-0 rounded-lg md:size-[70px]"
                  />
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-sm leading-4 font-bold break-words text-fg md:text-base">{line.name}</span>
                    <span className="text-xs leading-4 text-fg-subtle md:text-sm">
                      ID do token: #{line.tokenId}
                      <span className="sr-only">, edição {line.editionLabel}</span>
                    </span>
                  </div>
                </div>
              </td>
              <td className={cn('px-2 py-1.5 text-center text-sm whitespace-nowrap text-fg-muted md:pr-6 md:pl-0', index === 0 && 'pt-3')}>
                <span aria-hidden="true">(x {line.quantity})</span>
                <span className="sr-only">{line.quantity === 1 ? '1 unidade' : `${line.quantity} unidades`}</span>
              </td>
              <td
                className={cn(
                  'py-1.5 text-right text-base font-bold whitespace-nowrap text-brand-text md:text-lg',
                  index === 0 && 'pt-3',
                )}
              >
                {formatEth(line.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="ml-auto grid w-full max-w-[321px] grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-3 leading-[18px]" data-testid="order-totals">
        {hasDiscount && (
          <>
            <dt className="text-[15px] text-fg">Subtotal</dt>
            <dd className="text-right text-lg text-fg">{formatEth(order.subtotal)}</dd>
            <dt className="text-[15px] text-fg">
              Desconto{order.couponCode && <span className="text-fg-subtle"> ({order.couponCode})</span>}
            </dt>
            <dd className="text-right text-lg text-success">−{formatEth(order.discount)}</dd>
          </>
        )}
        <dt className="text-[15px] text-fg">Taxa de rede</dt>
        <dd className="text-right text-lg text-fg">{formatEth(order.networkFee)}</dd>
        <dt className="text-base font-bold text-fg">Total</dt>
        <dd className="text-right text-lg font-bold text-brand-text" data-testid="order-total">
          {formatEth(order.total)}
        </dd>
      </dl>
    </div>
  )
}
