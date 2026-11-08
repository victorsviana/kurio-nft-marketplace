import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/page-placeholder'

export const Route = createFileRoute('/signup')({
  component: () => <PagePlaceholder title="Criar conta" requirement="AUTH" />,
})
