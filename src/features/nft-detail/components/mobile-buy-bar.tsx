import { Link } from '@tanstack/react-router'
import { useId } from 'react'
import { MaskIcon } from '@/components/ui/mask-icon'
import { cn } from '@/lib/utils'
import { cartUnits, useCart } from '@/shared/api/endpoints/cart'
import { formatEth } from '@/shared/lib/format'
import iconShop from '../assets/mobile-icon-shop.svg'
import type { PurchaseState } from '../use-purchase'
import { PurchaseNotice } from './purchase-notice'
import { PriceUpdatedChip } from './price-updated-chip'
import { QuantityStepper } from './quantity-stepper'

/**
 * Mobile buy bar (Figma: fixed bottom, 164px). Implemented as `sticky bottom-0` as the last
 * child of the page: it stays pinned while the NFT is on screen and comes to rest above the
 * global footer at the end, so it never covers content (no layout-level padding needed).
 */
export function MobileBuyBar({ purchase }: { purchase: PurchaseState }) {
  const qtyId = useId()
  const noticeId = useId()
  const { data: cart } = useCart()
  const units = cartUnits(cart)
  const disabled = !purchase.canBuy

  return (
    <div
      className="sticky bottom-0 z-20 mt-10 flex flex-col gap-5 rounded-t-[40px] bg-surface px-6 pt-5 pb-[calc(36px+env(safe-area-inset-bottom))] shadow-[0_0_10px_rgba(10,6,4,0.45)]"
      data-testid="mobile-buy-bar"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span id={qtyId} className="text-[15px] font-medium text-fg-muted">
            Qtd.
          </span>
          <QuantityStepper
            size="sm"
            labelledBy={qtyId}
            quantity={purchase.quantity}
            max={purchase.max}
            onIncrement={purchase.increment}
            onDecrement={purchase.decrement}
          />
        </div>
        <div className="flex flex-col items-end gap-1">
          <p data-testid="nft-price" className="text-xl leading-4 font-bold whitespace-nowrap text-brand-text">
            <span className="sr-only">Preço: </span>
            {formatEth(purchase.edition.price)}
          </p>
          {purchase.priceRecentlyChanged && <PriceUpdatedChip />}
        </div>
      </div>

      <PurchaseNotice id={noticeId} feedback={purchase.feedback} blockedReason={purchase.blockedReason} className="-my-2" />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={purchase.buy}
          aria-disabled={disabled}
          aria-busy={purchase.pending}
          aria-describedby={purchase.feedback || purchase.blockedReason ? noticeId : undefined}
          className={cn(
            'h-[60px] w-[196px] rounded-[40px] bg-[linear-gradient(100.4deg,#D28A4C_4%,rgba(210,138,76,0.8)_122%)] text-base leading-5 font-bold text-ink transition-opacity',
            'hover:opacity-90 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
          )}
        >
          {purchase.pending ? 'Adicionando…' : 'Comprar NFT'}
        </button>
        <Link
          to="/cart"
          aria-label={units > 0 ? `Carrinho, ${units} ${units === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'}
          className="relative grid size-[60px] shrink-0 place-items-center rounded-full border border-line bg-[#2F1D15] text-fg-subtle transition-colors hover:text-brand-text"
        >
          <MaskIcon src={iconShop} width={20} height={20} />
          {units > 0 && (
            <span
              aria-hidden="true"
              data-testid="mobile-cart-count"
              className="absolute top-2.5 right-2 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] leading-none font-medium text-ink"
            >
              {units > 99 ? '99+' : units}
            </span>
          )}
        </Link>
      </div>
    </div>
  )
}
