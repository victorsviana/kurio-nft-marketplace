import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/page-placeholder'
import { requireUser } from '@/shared/session/guards'

export const Route = createFileRoute('/account/profile')({
  beforeLoad: requireUser,
  staticData: { section: 'inicio', requiresAuth: true, mobileTabBar: true },
  component: () => <PagePlaceholder title="Perfil do colecionador" requirement="PRF" />,
})
