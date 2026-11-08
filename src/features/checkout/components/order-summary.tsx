import { useId, useState, type FormEvent } from 'react'
import { ErrorState } from '@/components/feedback/states'
import { NftImage } from '@/components/nft/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useAnnounce } from '@/shared/a11y/announcer'
import { useApplyCoupon, useRemoveCoupon } from '@/shared/api/endpoints/cart'
import { toApiError } from '@/shared/api/errors'
import { couponInputSchema, type Quote, type QuoteLine } from '@/shared/contracts'
import { formatEth } from '@/shared/lib/format'
import type { CheckoutController } from '../lib/use-checkout'
import { controlClass } from './control-class'

/**
 * Right column of the desktop frame: "Seus NFTs" lines and the summary. Every value comes from
 * the server quote (CART-06): the client never adds prices up.
 */
export function OrderSummary({ checkout, disabled }: { checkout: CheckoutController; disabled?: boolean }) {
  const { quote } = checkout
  return (
    <section aria-labelledby="checkout-items-title" className="flex flex-col gap-3">
      <h2 id="checkout-items-title" className="text-[17px] leading-4 font-bold text-fg">
        Seus NFTs
      </h2>
      {quote.isPending ? (
        <SummarySkeleton />
      ) : quote.isError && !quote.data ? (
        <ErrorState error={quote.error} title="Não foi possível calcular o resumo" onRetry={() => void quote.refetch()} />
      ) : quote.data ? (
        <SummaryContent quote={quote.data} disabled={disabled} />
      ) : null}
    </section>
  )
}

function SummaryContent({ quote, disabled }: { quote: Quote; disabled?: boolean }) {
  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between border-b-[0.3px] border-brand pb-2 text-base leading-4 text-fg">
          <span className="font-bold">NFTs</span>
          <span className="font-medium">Subtotal</span>
        </div>
        <ul className="flex flex-col gap-3" aria-label="Itens do pedido">
          {quote.items.map((line) => (
            <SummaryLine key={line.itemId} line={line} />
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <CouponControl quote={quote} disabled={disabled} />
        <dl className="flex flex-col gap-3">
          <Row label="Subtotal" value={formatEth(quote.subtotal)} />
          <Row
            label={quote.coupon?.status === 'applied' ? `Desconto (${quote.coupon.code})` : 'Desconto do lançamento'}
            value={`(-) ${formatEth(quote.discount)}`}
            small
          />
          <Row label="Taxa de rede" value={formatEth(quote.networkFee)} />
        </dl>
        <p className="text-center text-xs leading-4 text-brand-text">Taxa estimada</p>
        <div className="flex items-center justify-between border-t-[0.3px] border-brand px-0 pt-3 sm:px-[42px]">
          <span className="text-base leading-4 font-bold text-fg">Total</span>
          <span className="text-lg leading-4 font-bold text-brand-text" data-testid="checkout-total">
            {formatEth(quote.total)}
          </span>
        </div>
      </div>
    </>
  )
}

function Row({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[15px] leading-4 text-fg">{label}</dt>
      <dd className={cn('text-fg', small ? 'text-[15px] leading-4' : 'text-lg leading-4')}>{value}</dd>
    </div>
  )
}

function SummaryLine({ line }: { line: QuoteLine }) {
  const soldOut = line.available === 0
  const short = !soldOut && line.quantity > line.available
  return (
    <li className="flex min-h-[70px] items-center gap-1.5 rounded-sm bg-surface py-1 pr-4 pl-1">
      <NftImage src={line.image} alt={line.name} sizes="70px" width={66} height={66} className="size-[66px] shrink-0 rounded-lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-base leading-4 font-bold text-fg">{line.name}</p>
        <p className="truncate text-sm leading-4 text-fg-subtle">ID do token: #{line.tokenId}</p>
        <p className="truncate text-xs leading-3.5 text-fg-subtle">Edição {line.editionLabel}</p>
        {(soldOut || short) && (
          <p className="text-[13px] leading-4 text-danger">
            {soldOut ? 'Edição esgotada' : `Só ${line.available} disponíveis`}
          </p>
        )}
      </div>
      <span className="shrink-0 text-sm leading-4 text-fg-muted">
        <span className="sr-only">Quantidade: </span>(x {line.quantity})
      </span>
      <span className="shrink-0 text-lg leading-4 font-bold text-brand-text">{formatEth(line.lineTotal)}</span>
    </li>
  )
}

const COUPON_STATUS: Record<'invalid' | 'expired', string> = {
  invalid: 'inválido',
  expired: 'expirado',
}

/** "Tem um código promocional? Aplique aqui": inline form using the cart coupon endpoint. */
function CouponControl({ quote, disabled }: { quote: Quote; disabled?: boolean }) {
  const announce = useAnnounce()
  const panelId = useId()
  const inputId = useId()
  const errorId = useId()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const coupon = quote.coupon

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = couponInputSchema.safeParse({ code })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Informe um cupom')
      document.getElementById(inputId)?.focus()
      return
    }
    setError(null)
    apply.mutate(parsed.data.code, {
      onSuccess: (cart) => {
        setCode('')
        setOpen(false)
        announce(`Cupom ${cart.couponCode ?? parsed.data.code} enviado. O resumo foi atualizado.`)
      },
      onError: (err) => {
        const message = toApiError(err).message || 'Não foi possível aplicar o cupom.'
        setError(message)
        announce(message, 'assertive')
      },
    })
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {coupon ? (
        <p className="text-center text-sm leading-4 text-fg">
          Cupom <strong>{coupon.code}</strong>{' '}
          {coupon.status === 'applied' ? 'aplicado' : <span className="text-danger">{COUPON_STATUS[coupon.status]}</span>}
          {' · '}
          <button
            type="button"
            disabled={disabled || remove.isPending}
            onClick={() =>
              remove.mutate(undefined, {
                onSuccess: () => announce('Cupom removido. O resumo foi atualizado.'),
              })
            }
            className="text-brand-text underline-offset-4 hover:underline disabled:opacity-60"
          >
            Remover
          </button>
        </p>
      ) : (
        <p className="text-center text-sm leading-4 text-fg">
          Tem um código promocional?{' '}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            disabled={disabled}
            onClick={() => setOpen((value) => !value)}
            className="underline-offset-4 hover:text-brand-text hover:underline"
          >
            Aplique aqui
          </button>
        </p>
      )}
      <form id={panelId} hidden={!open || Boolean(coupon)} onSubmit={onSubmit} noValidate className="w-full">
        <div className="flex gap-2">
          <label htmlFor={inputId} className="sr-only">
            Código promocional
          </label>
          <input
            id={inputId}
            value={code}
            onChange={(event) => {
              setCode(event.target.value)
              setError(null)
            }}
            placeholder="Código promocional"
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(controlClass, 'uppercase placeholder:normal-case')}
          />
          <button
            type="submit"
            disabled={apply.isPending || disabled}
            className="h-10 shrink-0 rounded-[3px] border border-brand px-4 text-sm font-bold text-brand-text hover:bg-brand/10 disabled:opacity-60"
          >
            {apply.isPending ? 'Aplicando…' : 'Aplicar'}
          </button>
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-[13px] leading-4 text-danger">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}

function SummarySkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">Calculando o resumo…</span>
      <Skeleton className="h-6 w-full" />
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-[70px] w-full rounded-sm" />
      ))}
      <Skeleton className="mx-auto h-4 w-64" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
      <Skeleton className="h-6 w-full" />
    </div>
  )
}
