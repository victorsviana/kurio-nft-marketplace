import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { ErrorState } from '@/components/feedback/states'
import { clearOrderAttempt } from '@/features/checkout/lib/order-attempt'
import { useAnnounce } from '@/shared/a11y/announcer'
import { orderQuery } from '@/shared/api/endpoints/account'
import { toApiError } from '@/shared/api/errors'
import type { OrderStatus } from '@/shared/contracts'
import { useRealtimeStatus } from '@/shared/realtime/realtime-provider'
import { useAuth } from '@/shared/session/auth'
import { OrderFrame } from './components/order-frame'
import { ConfirmedView, DeclinedView, OrderNotFound, OrderSkeleton, PendingView } from './components/order-views'

/** Realtime is down: poll the pending order instead (ORD-02). */
const FALLBACK_POLL_MS = 4_000

const TITLES: Record<OrderStatus | 'loading', string> = {
  loading: 'Pedido',
  pending: 'Pedido pendente',
  confirmed: 'Pedido confirmado',
  declined: 'Pagamento recusado',
}

/**
 * `/orders/$orderId` (ORD-01..ORD-05, RT-03, RT-05, RT-06).
 *
 * The order is read by REST and kept current by `order.updated`, which cache-sync applies to
 * this query with version checks (stale or duplicated events never regress it) and by the
 * reconciliation after a reconnection. This screen never writes the cache: it reacts to the
 * status it observes. Transitions are tracked here, above the per-status views, so that
 * swapping the view never loses or repeats the announcement:
 * - pending → confirmed/declined is announced once (polite / assertive);
 * - focus moves to the heading on first render and on every status change;
 * - a terminal order releases the checkout attempt (its Idempotency-Key).
 *
 * Mount with `key={orderId}` so the transition tracking starts over for another order.
 */
export function OrderStatusScreen({ orderId }: { orderId: string }) {
  const auth = useAuth()
  const userId = auth.status === 'authenticated' ? auth.user.id : null
  const realtime = useRealtimeStatus()
  const announce = useAnnounce()
  const headingRef = useRef<HTMLHeadingElement>(null)

  const query = useQuery({
    ...orderQuery(userId ?? '', orderId),
    enabled: userId !== null,
    refetchInterval: (q) => (q.state.data?.status === 'pending' && realtime !== 'connected' ? FALLBACK_POLL_MS : false),
  })

  const order = query.data
  const status = order?.status
  const notFound = query.isError && !order && [403, 404].includes(toApiError(query.error).status)

  // Transition tracking: keyed on the observed status, not on raw events (RT-05).
  const previous = useRef<OrderStatus | undefined>(undefined)
  useEffect(() => {
    if (!status) return
    const before = previous.current
    previous.current = status
    if (before === status) return

    headingRef.current?.focus()
    if (status !== 'pending' && userId) clearOrderAttempt(userId)
    if (before !== 'pending') return // first observation: nothing changed in front of the user
    if (status === 'confirmed') announce('Pedido confirmado. Seus NFTs agora estão na sua carteira.', 'polite')
    if (status === 'declined') {
      announce(`Pagamento recusado. ${order?.declineReason ?? ''} Nenhum valor foi cobrado.`.replace(/\s+/g, ' '), 'assertive')
    }
  }, [status, userId, announce, order?.declineReason])

  useEffect(() => {
    if (notFound) headingRef.current?.focus()
  }, [notFound])

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${TITLES[status ?? 'loading']} | Kurio`
    return () => {
      document.title = previousTitle
    }
  }, [status])

  if (order) {
    if (order.status === 'confirmed') return <ConfirmedView order={order} headingRef={headingRef} />
    if (order.status === 'declined') return <DeclinedView order={order} headingRef={headingRef} />
    return <PendingView order={order} headingRef={headingRef} live={realtime === 'connected'} />
  }
  if (notFound) return <OrderNotFound headingRef={headingRef} />
  if (query.isError) {
    return (
      <OrderFrame>
        <ErrorState
          error={query.error}
          title="Não foi possível carregar o pedido"
          onRetry={() => void query.refetch()}
          className="rounded-none pt-14"
        />
      </OrderFrame>
    )
  }
  return <OrderSkeleton />
}
