import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/page-placeholder'
import { catalogSearchSchema } from '@/shared/contracts'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  staticData: { section: 'inicio', mobileHeader: false, mobileTabBar: true },
  component: () => <PagePlaceholder title="Início" requirement="CAT" />,
})
