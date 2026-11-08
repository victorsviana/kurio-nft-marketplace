import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/page-placeholder'

export const Route = createFileRoute('/orders/$orderId')({
  component: () => <PagePlaceholder title="Confirmação de pedido" requirement="ORD" />,
})
