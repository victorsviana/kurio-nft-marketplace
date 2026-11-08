import { createFileRoute } from '@tanstack/react-router'
import { CartScreen } from '@/features/cart/cart-screen'

export const Route = createFileRoute('/cart')({
  // Figma: "Mercado" active without divisor on desktop; the mobile frame has its own top bar
  // and no global header, tab bar or footer.
  staticData: { section: 'mercado', headerDivider: false, mobileHeader: false, mobileTabBar: false, mobileFooter: false },
  component: CartScreen,
})
