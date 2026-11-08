import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/page-placeholder'

export const Route = createFileRoute('/login')({
  component: () => <PagePlaceholder title="Entrar" requirement="AUTH" />,
})
