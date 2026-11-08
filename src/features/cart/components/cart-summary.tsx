import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import Big from 'big.js'
import { Info, Loader2 } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toApiError } from '@/shared/api/errors'
import type { Cart, Quote } from '@/shared/contracts'
import { formatEth } from '@/shared/lib/format'
import { CouponForm } from './coupon-form'

type Variant = 'desktop' | 'mobile'

/**
 * "Resumo da carteira" (CART-05, CART-06). Every amount is the quote's string, formatted only
 * (never recomputed on the client). "Conectar e finalizar" goes to /checkout (the guard sends
 * visitors to /login and back; the login merges the visitor cart) and is disabled, with a
 * visible reason, while the cart cannot be bought.
 */
export function CartSummary({
  cart,
  quote,
  variant,
  className,
}: {
  cart: Cart
  quote: UseQueryResult<Quote>
  variant: Variant
  className?: string
}) {
  const headingId = useId()
  const reasonId = useId()
  const data = quote.data
  /** The quote priced an older cart (a change is being re-priced right now). */
  const outdated = Boolean(data && data.cartVersion !== cart.version)

  const blockedReason =
    cart.items.length === 0
      ? 'Adicione um NFT ao carrinho para finalizar.'
      : quote.isError && !data
        ? 'Não foi possível calcular o resumo da compra.'
        : data && !data.purchasable
          ? 'Há itens esgotados ou acima da disponibilidade. Ajuste os itens indicados para finalizar.'
          : null
  const busy = !data || outdated
  const canCheckout = !blockedReason && !busy

  const desktop = variant === 'desktop'
  const ctaClass = desktop
    ? 'flex h-10 w-full items-center justify-center gap-2 rounded-[3px] bg-brand text-[15px] leading-4 font-bold text-ink transition-colors hover:bg-brand-text'
    : 'flex h-[60px] w-full items-center justify-center gap-2 rounded-[40px] bg-[linear-gradient(109deg,#D28A4C_4%,rgba(210,138,76,0.8)_122%)] text-base leading-4 font-bold text-ink'

  return (
    <section aria-labelledby={headingId} className={cn('flex flex-col', desktop ? 'gap-6' : 'gap-5', className)} data-testid="cart-summary">
      <div className={desktop ? 'flex flex-col gap-3' : 'sr-only'}>
        <h2 id={headingId} className="text-lg leading-4 font-bold text-fg">
          Resumo da carteira
        </h2>
        <div aria-hidden="true" className="h-px bg-brand/30" />
      </div>

      <CouponForm cart={cart} quote={data} variant={variant} />

      {data ? (
        <div aria-busy={quote.isFetching} className={cn('flex flex-col gap-3 transition-opacity', outdated && 'opacity-60')}>
          <dl className="flex flex-col gap-3 text-[15px] text-fg">
            <Row label="Subtotal" testId="summary-subtotal" valueClass={desktop ? 'text-lg leading-4' : 'text-base leading-4'}>
              {formatEth(data.subtotal)}
            </Row>
            <Row label="Desconto do lançamento" testId="summary-discount" valueClass="text-[15px] leading-4">
              {new Big(data.discount).gt(0) ? (
                <>
                  <span aria-hidden="true">(-) </span>
                  <span className="sr-only">menos </span>
                  {formatEth(data.discount)}
                </>
              ) : (
                <>
                  <span aria-hidden="true">(-) 00.00</span>
                  <span className="sr-only">sem desconto</span>
                </>
              )}
            </Row>
            <div className="flex flex-col gap-1">
              <Row label="Taxa de rede" testId="summary-fee" valueClass={desktop ? 'text-lg leading-4' : 'text-base leading-4'}>
                {formatEth(data.networkFee)}
              </Row>
              <p className="text-right text-xs leading-4 text-brand-text">Taxa estimada</p>
            </div>
          </dl>
          <dl className={cn('flex items-center justify-between gap-4', desktop && 'mt-4')}>
            <dt className="text-base leading-4 font-bold text-fg">Total</dt>
            <dd className="text-lg leading-4 font-bold text-brand-text" data-testid="summary-total">
              {formatEth(data.total)}
            </dd>
          </dl>
        </div>
      ) : quote.isError ? (
        <div role="alert" className="flex flex-col items-start gap-2 text-[13px] leading-5 text-danger">
          <p>Não foi possível calcular o resumo. {toApiError(quote.error).message}</p>
          <button
            type="button"
            onClick={() => void quote.refetch()}
            className="font-bold text-brand-text underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <SummaryValuesSkeleton />
      )}

      <div className={cn('flex flex-col items-center gap-3', !desktop && 'mt-1')}>
        {canCheckout ? (
          <Link to="/checkout" preload={false} className={ctaClass} data-testid="checkout-cta">
            Conectar e finalizar
          </Link>
        ) : (
          <button
            type="button"
            aria-disabled="true"
            aria-busy={busy && !blockedReason}
            aria-describedby={blockedReason ? reasonId : undefined}
            className={cn(ctaClass, 'cursor-not-allowed opacity-50')}
            data-testid="checkout-cta"
          >
            {busy && !blockedReason && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            Conectar e finalizar
          </button>
        )}
        {blockedReason && (
          <p id={reasonId} className="flex items-start gap-1.5 self-stretch text-[13px] leading-5 text-fg-muted" data-testid="checkout-blocked">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{blockedReason}</span>
          </p>
        )}
        {desktop && (
          <Link to="/" hash="catalogo" className="text-[15px] leading-6 text-brand-text hover:text-fg">
            Continuar explorando
          </Link>
        )}
      </div>
    </section>
  )
}

function Row({ label, testId, valueClass, children }: { label: string; testId: string; valueClass: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt>{label}</dt>
      <dd className={cn('text-right tabular-nums', valueClass)} data-testid={testId}>
        {children}
      </dd>
    </div>
  )
}

export function SummaryValuesSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-3 w-24 self-end" />
      <div className="mt-4 flex justify-between">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  )
}
