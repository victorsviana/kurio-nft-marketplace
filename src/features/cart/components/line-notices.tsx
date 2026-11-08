import { AlertCircle, AlertTriangle, RefreshCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CartItem } from '@/shared/contracts'
import { remaining, type StockIssue } from '../lib/lines'
import type { CartLineControls } from '../use-cart-line'
import type { RealtimeNotice } from '../use-cart-realtime'

const actionClass =
  'rounded-[3px] border border-brand px-2 py-0.5 text-xs leading-5 font-bold text-brand-text transition-colors hover:bg-brand/10 aria-disabled:cursor-not-allowed aria-disabled:opacity-50'

/**
 * Everything the user must know about one line, always as text + icon (A11Y-05): the API error
 * of the last change (409), the stock problem reported by the quote with its fix, and the last
 * realtime change (CART-07). Not a live region: the same text was already announced.
 */
export function LineNotices({
  id,
  item,
  line,
  issue,
  notice,
  onDismiss,
  className,
}: {
  id: string
  item: CartItem
  line: CartLineControls
  issue: StockIssue | null
  notice: RealtimeNotice | null
  onDismiss: () => void
  className?: string
}) {
  // The quote's sold-out issue already says "Esgotado" with its fix: do not repeat it.
  const realtime = notice && issue?.type === 'SOLD_OUT' ? { ...notice, messages: notice.messages.filter((m) => m !== 'Esgotado') } : notice
  const shownNotice = realtime && realtime.messages.length > 0 ? realtime : null
  if (!line.error && !issue && !shownNotice) return null
  return (
    <div id={id} data-testid="cart-line-notice" className={cn('flex flex-col gap-1.5 text-[13px] leading-5', className)}>
      {line.error && (
        <p className="flex items-start gap-1.5 text-danger">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{line.error}</span>
        </p>
      )}
      {issue && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-danger">
          <p className="flex items-start gap-1.5">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              {issue.type === 'SOLD_OUT'
                ? 'Esgotado: remova este item para finalizar a compra.'
                : `Disponibilidade reduzida: ${remaining(issue.available).toLowerCase()} (você tem ${item.quantity}).`}
            </span>
          </p>
          {issue.type === 'AVAILABILITY_CHANGED' ? (
            <button
              type="button"
              className={actionClass}
              aria-disabled={line.pending}
              onClick={() => line.setQuantity(issue.available)}
              aria-label={`Ajustar ${item.name} para ${issue.available}`}
            >
              Ajustar para {issue.available}
            </button>
          ) : (
            <button
              type="button"
              className={actionClass}
              aria-disabled={line.pending}
              onClick={line.removeLine}
              aria-label={`Remover ${item.name} esgotado`}
            >
              Remover
            </button>
          )}
        </div>
      )}
      {shownNotice && (
        <div className={cn('flex items-start gap-1.5', shownNotice.urgent ? 'text-danger' : 'text-brand-text')}>
          <RefreshCw aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p className="min-w-0 flex-1">
            <span className="sr-only">Atualização em tempo real: </span>
            {shownNotice.messages.join(' · ')}
          </p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={`Dispensar aviso de ${item.name}`}
            className="relative grid size-5 shrink-0 place-items-center rounded-full text-fg-subtle transition-colors after:absolute after:-inset-2 hover:text-fg"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
