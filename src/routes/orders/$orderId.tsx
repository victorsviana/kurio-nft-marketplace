import { createFileRoute } from '@tanstack/react-router'
import { OrderStatusScreen } from '@/features/orders/order-status-screen'
import { requireUser } from '@/shared/session/guards'

export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: requireUser,
  // The Figma frame shows only the card over a dark scrim: no footer on mobile.
  staticData: { section: 'mercado', headerDivider: false, requiresAuth: true, mobileFooter: false },
  component: OrderRoute,
})

function OrderRoute() {
  const { orderId } = Route.useParams()
  return <OrderStatusScreen key={orderId} orderId={orderId} />
}
