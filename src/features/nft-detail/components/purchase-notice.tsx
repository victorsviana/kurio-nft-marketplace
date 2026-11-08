import { Link } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PurchaseFeedback } from '../use-purchase'

/**
 * Visible outcome of the buy controls. Screen readers already got the same text through the
 * live region (useAnnounce), so this block is not a live region itself (no double reading).
 */
export function PurchaseNotice({
  id,
  feedback,
  blockedReason,
  className,
}: {
  id?: string
  feedback: PurchaseFeedback | null
  blockedReason: string | null
  className?: string
}) {
  if (!feedback && !blockedReason) return null
  return (
    <div id={id} className={cn('flex flex-col gap-1 text-[13px] leading-5', className)} data-testid="purchase-notice">
      {feedback && (
        <p className={cn('flex items-start gap-1.5', feedback.kind === 'error' ? 'text-danger' : 'text-success')}>
          {feedback.kind === 'error' ? (
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          ) : (
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          )}
          <span>
            {feedback.message}
            {feedback.kind === 'success' && (
              <>
                {' '}
                <Link to="/cart" className="font-medium text-brand-text underline underline-offset-2 hover:text-fg">
                  Ver carrinho
                </Link>
              </>
            )}
          </span>
        </p>
      )}
      {blockedReason && (
        <p className="flex items-start gap-1.5 text-fg-muted">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{blockedReason}</span>
        </p>
      )}
    </div>
  )
}
