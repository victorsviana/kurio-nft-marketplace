import { Link } from '@tanstack/react-router'
import { AlertTriangle, Clock, Info, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { unavailableLines } from '../lib/quote-diff'
import type { CheckoutController } from '../lib/use-checkout'

function Notice({ tone, icon, children, testId }: { tone: 'info' | 'warning' | 'danger'; icon: ReactNode; children: ReactNode; testId?: string }) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm leading-5 text-fg',
        tone === 'danger' ? 'border-danger/60 bg-danger/10' : tone === 'warning' ? 'border-brand/60 bg-brand/10' : 'border-line-soft bg-surface',
      )}
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/**
 * Page-level messages above the CTA: pending order (submissions disabled), realtime update of
 * the summary (RT-09), lines that can no longer be bought, and form-level failures.
 */
export function CheckoutNotices({ checkout }: { checkout: CheckoutController }) {
  const { pendingOrder, updateNotice, formAlert, quote } = checkout
  const blockedLines = quote.data ? unavailableLines(quote.data) : []
  return (
    <>
      {pendingOrder && (
        <Notice tone="warning" icon={<Clock className="size-4 text-brand-text" />} testId="pending-order-notice">
          Você tem um pedido aguardando confirmação. Aguarde o resultado antes de fazer outra compra.{' '}
          <Link
            to="/orders/$orderId"
            params={{ orderId: pendingOrder.id }}
            preload={false}
            className="font-bold text-brand-text underline-offset-4 hover:underline"
          >
            Ver pedido
          </Link>
        </Notice>
      )}
      {blockedLines.length > 0 && (
        <Notice tone="danger" icon={<AlertTriangle className="size-4 text-danger" />} testId="unavailable-notice">
          {blockedLines.map((line) => (
            <span key={line.itemId} className="block">
              {line.name} · {line.editionLabel}: {line.available === 0 ? 'edição esgotada' : `só ${line.available} disponíveis`}
            </span>
          ))}
          <Link to="/cart" className="font-bold text-brand-text underline-offset-4 hover:underline">
            Ajustar carrinho
          </Link>
        </Notice>
      )}
      {updateNotice && (
        <Notice tone="info" icon={<Info className="size-4 text-brand-text" />} testId="update-notice">
          <div className="flex items-start justify-between gap-2">
            <span>{updateNotice}</span>
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={checkout.dismissUpdateNotice}
              className="grid size-6 shrink-0 place-content-center rounded text-fg-subtle hover:text-fg"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        </Notice>
      )}
      {formAlert && (
        <Notice tone="danger" icon={<AlertTriangle className="size-4 text-danger" />} testId="form-alert">
          {formAlert}
        </Notice>
      )}
    </>
  )
}

/** Loading state with the boxes of the real layout (GEN-05). */
export function CheckoutSkeleton({ desktop }: { desktop: boolean }) {
  return (
    <div role="status" aria-busy="true" data-testid="checkout-skeleton">
      <span className="sr-only">Carregando pagamento…</span>
      {desktop ? (
        <div aria-hidden="true" className="container-page pt-8 pb-16">
          <Skeleton className="h-4 w-60" />
          <div className="mt-8 flex flex-col gap-8 lg:flex-row">
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-4 w-52" />
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="flex flex-col">
                    <Skeleton className="my-[7px] h-4 w-32" />
                    <Skeleton className="h-10 w-full rounded-[3px]" />
                  </div>
                ))}
              </div>
              <Skeleton className="mt-3 h-[152px] w-full max-w-[350px] rounded-[3px]" />
            </div>
            <div className="flex w-full flex-col gap-3 lg:w-[405px]">
              <Skeleton className="h-4 w-28" />
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[70px] w-full rounded-sm" />
              ))}
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={`r${i}`} className="h-5 w-full" />
              ))}
              {[0, 1, 2].map((i) => (
                <Skeleton key={`c${i}`} className="h-[45px] w-full rounded-[3px]" />
              ))}
              <Skeleton className="mt-3 h-[45px] w-full rounded-lg" />
            </div>
          </div>
        </div>
      ) : (
        <div aria-hidden="true" className="flex flex-col gap-4 px-7 py-8 max-[359px]:px-4">
          <Skeleton className="h-[35px] w-64 rounded-full" />
          <Skeleton className="h-12 w-full rounded-[14px]" />
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-[93px] w-full rounded-[14px]" />
          ))}
          {[0, 1, 2].map((i) => (
            <Skeleton key={`c${i}`} className="h-[65px] w-full rounded-[15px]" />
          ))}
          <Skeleton className="mt-8 h-[60px] w-full rounded-[40px]" />
        </div>
      )}
    </div>
  )
}
