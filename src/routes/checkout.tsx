import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/page-placeholder'
import { requireUser } from '@/shared/session/guards'

export const Route = createFileRoute('/checkout')({
  beforeLoad: requireUser,
  staticData: { section: 'mercado', headerDivider: false, requiresAuth: true },
  component: () => <PagePlaceholder title="Pagamento" requirement="CHK" />,
})
