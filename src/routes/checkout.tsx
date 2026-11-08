import { createFileRoute } from '@tanstack/react-router'
import { CheckoutScreen } from '@/features/checkout/checkout-screen'
import { requireUser } from '@/shared/session/guards'

export const Route = createFileRoute('/checkout')({
  beforeLoad: requireUser,
  staticData: {
    section: 'mercado',
    headerDivider: false,
    requiresAuth: true,
    // The mobile frame has its own top bar and a CTA pinned at the bottom.
    mobileHeader: false,
    mobileTabBar: false,
    mobileFooter: false,
  },
  component: CheckoutScreen,
})
