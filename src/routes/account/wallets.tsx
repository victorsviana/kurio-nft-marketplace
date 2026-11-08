import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/page-placeholder'

export const Route = createFileRoute('/account/wallets')({
  component: () => <PagePlaceholder title="Carteiras" requirement="WAL" />,
})
