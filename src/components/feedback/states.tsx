import { AlertTriangle, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toApiError } from '@/shared/api/errors'

/**
 * Standard data states (GEN-06). Every screen with data uses these for error and empty, so
 * the "Tentar novamente" behavior and wording stay consistent.
 */
export function ErrorState({
  error,
  onRetry,
  title = 'Não foi possível carregar',
  className,
}: {
  error: unknown
  onRetry?: () => void
  title?: string
  className?: string
}) {
  const apiError = toApiError(error)
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 rounded-lg bg-surface px-6 py-10 text-center', className)}>
      <AlertTriangle aria-hidden="true" className="size-8 text-danger" />
      <h2 className="text-lg font-bold text-fg">{title}</h2>
      <p className="max-w-md text-sm text-fg-muted">
        {apiError.message}
        {apiError.code !== 'UNKNOWN' && <span className="sr-only"> (código {apiError.code})</span>}
      </p>
      {onRetry && (
        <Button type="button" onClick={onRetry} className="mt-1">
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div role="status" className={cn('flex flex-col items-center gap-3 rounded-lg bg-surface px-6 py-10 text-center', className)}>
      <SearchX aria-hidden="true" className="size-8 text-fg-subtle" />
      <h2 className="text-lg font-bold text-fg">{title}</h2>
      {description && <p className="max-w-md text-sm text-fg-muted">{description}</p>}
      {action}
    </div>
  )
}
