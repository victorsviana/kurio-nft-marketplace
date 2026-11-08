import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/page-placeholder'

export const Route = createFileRoute('/cart')({
  component: () => <PagePlaceholder title="Carrinho de NFTs" requirement="CART" />,
})
