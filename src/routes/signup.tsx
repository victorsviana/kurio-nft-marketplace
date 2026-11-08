import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/page-placeholder'
import { authSearchSchema } from '@/shared/session/auth-search'

export const Route = createFileRoute('/signup')({
  validateSearch: authSearchSchema,
  staticData: { section: 'inicio', mobileHeader: false },
  component: () => <PagePlaceholder title="Criar conta" requirement="AUTH" />,
})
