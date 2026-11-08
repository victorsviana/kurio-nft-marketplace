import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAnnounce } from '@/shared/a11y/announcer'
import { useApplyCoupon, useRemoveCoupon } from '@/shared/api/endpoints/cart'
import { toApiError } from '@/shared/api/errors'
import { couponInputSchema, type Cart, type Quote } from '@/shared/contracts'

type Variant = 'desktop' | 'mobile'

/**
 * Promo code (CART-05). The server decides: COUPON_INVALID and COUPON_EXPIRED come back with
 * distinct messages, shown under the input (aria-invalid + aria-describedby, A11Y-03). Once
 * applied, the code and "Remover cupom" replace the input; a coupon that expired after being
 * applied (quote `coupon.status`) stays visible with its own warning.
 */
export function CouponForm({ cart, quote, variant }: { cart: Cart; quote: Quote | undefined; variant: Variant }) {
  const announce = useAnnounce()
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const inputId = useId()
  const errorId = useId()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const removeRef = useRef<HTMLButtonElement>(null)
  /** Where focus goes after the form swaps between "input" and "applied" (the old control disappears). */
  const focusNext = useRef<'input' | 'remove' | null>(null)

  const applied = cart.couponCode
  useEffect(() => {
    if (focusNext.current === 'remove' && applied) removeRef.current?.focus()
    if (focusNext.current === 'input' && !applied) inputRef.current?.focus()
    focusNext.current = null
  }, [applied])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (apply.isPending) return
    const parsed = couponInputSchema.safeParse({ code })
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Informe um cupom'
      setError(message)
      announce(message, 'assertive')
      inputRef.current?.focus()
      return
    }
    setError(null)
    apply
      .mutateAsync(parsed.data.code)
      .then(() => {
        focusNext.current = 'remove'
        setCode('')
        const message = `Cupom ${parsed.data.code} aplicado.`
        toast.success(message)
        announce(message)
      })
      .catch((err: unknown) => {
        const apiError = toApiError(err)
        const message = apiError.fieldErrors.code ?? apiError.message
        setError(message)
        announce(message, 'assertive')
        inputRef.current?.focus()
      })
  }

  function removeCoupon() {
    if (remove.isPending || !applied) return
    remove
      .mutateAsync()
      .then(() => {
        focusNext.current = 'input'
        setError(null)
        const message = `Cupom ${applied} removido.`
        toast.success(message)
        announce(message)
      })
      .catch((err: unknown) => {
        const message = `Não foi possível remover o cupom. ${toApiError(err).message}`
        toast.error(message)
        announce(message, 'assertive')
      })
  }

  const labelClass =
    variant === 'desktop' ? 'text-sm leading-4 font-bold text-fg' : 'sr-only'

  if (applied) {
    const status = quote?.coupon?.code === applied ? quote.coupon.status : 'applied'
    return (
      <div className="flex flex-col gap-2" data-testid="coupon-applied">
        <p className={labelClass}>Código promocional</p>
        <div
          className={cn(
            'flex items-center justify-between gap-3 border px-3',
            variant === 'desktop' ? 'min-h-10 rounded-[3px] py-2' : 'min-h-[50px] rounded-[40px] py-2 pl-4',
            status === 'applied' ? 'border-brand/60' : 'border-danger/70',
          )}
        >
          <p className={cn('flex min-w-0 items-start gap-2 text-[13px] leading-5', status === 'applied' ? 'text-fg' : 'text-danger')}>
            {status === 'applied' ? (
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            )}
            <span>
              {status === 'applied' ? (
                <>
                  Cupom <strong className="font-bold text-brand-text">{applied}</strong> aplicado
                </>
              ) : status === 'expired' ? (
                <>O cupom {applied} expirou e não está mais sendo aplicado.</>
              ) : (
                <>O cupom {applied} não é mais válido e não está sendo aplicado.</>
              )}
            </span>
          </p>
          <button
            ref={removeRef}
            type="button"
            onClick={removeCoupon}
            aria-disabled={remove.isPending}
            className="shrink-0 text-[13px] leading-5 font-bold text-brand-text underline-offset-2 hover:underline aria-disabled:opacity-50"
          >
            {remove.isPending && <Loader2 aria-hidden="true" className="mr-1 inline size-3.5 animate-spin" />}
            Remover cupom
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Cupom de desconto" className="flex flex-col gap-2">
      <label htmlFor={inputId} className={labelClass}>
        Código promocional
      </label>
      {variant === 'desktop' ? (
        <div className="flex">
          <input
            ref={inputRef}
            id={inputId}
            name="coupon"
            value={code}
            onChange={(event) => {
              setCode(event.target.value)
              if (error) setError(null)
            }}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Digite o código promocional..."
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-10 min-w-0 flex-1 rounded-l-[3px] border border-r-0 border-brand bg-transparent pl-2 text-xs leading-4 text-fg uppercase placeholder:text-fg-subtle placeholder:normal-case focus-visible:outline-offset-0 aria-invalid:border-danger"
          />
          <button
            type="submit"
            aria-busy={apply.isPending}
            className="flex h-10 w-[102px] shrink-0 items-center justify-center gap-1 rounded-r-[3px] bg-brand text-[15px] leading-4 font-bold text-ink transition-colors hover:bg-brand-text"
          >
            {apply.isPending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            Aplicar
          </button>
        </div>
      ) : (
        <div
          className={cn(
            'relative flex h-[50px] items-center rounded-[40px] border bg-surface shadow-[0_6px_10px_rgba(10,6,4,0.45)] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring',
            error ? 'border-danger' : 'border-line',
          )}
        >
          <input
            ref={inputRef}
            id={inputId}
            name="coupon"
            value={code}
            onChange={(event) => {
              setCode(event.target.value)
              if (error) setError(null)
            }}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Digite o código promocional..."
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-full min-w-0 flex-1 rounded-l-[40px] bg-transparent pl-4 text-[13px] leading-[22px] text-fg uppercase placeholder:text-fg-subtle placeholder:normal-case focus-visible:outline-none"
          />
          <button
            type="submit"
            aria-busy={apply.isPending}
            className="-mr-px flex h-[50px] w-[97px] shrink-0 items-center justify-center gap-1 rounded-[40px] bg-[linear-gradient(96deg,rgba(210,138,76,0.54)_0.9%,#D28A4C_105%)] text-[15px] leading-4 font-bold text-fg"
          >
            {apply.isPending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            Aplicar
          </button>
        </div>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-[13px] leading-5 text-danger" data-testid="coupon-error">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </form>
  )
}
