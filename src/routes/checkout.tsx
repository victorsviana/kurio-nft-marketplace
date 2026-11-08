import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/page-placeholder'

export const Route = createFileRoute('/checkout')({
  component: () => <PagePlaceholder title="Pagamento" requirement="CHK" />,
})
