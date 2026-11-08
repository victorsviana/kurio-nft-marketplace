import { createFileRoute } from '@tanstack/react-router'
import { CatalogPage } from '@/features/catalog/catalog-page'
import { catalogSearchSchema } from '@/shared/contracts'

/**
 * Início / catálogo. The search params arrive as raw strings (non-coercing parser in
 * app/router.tsx) and are validated by the same schema the API uses (CAT-06). No loader: the
 * list query runs in the component so a filter change never blocks navigation and the
 * previous page stays visible while the next one loads.
 */
export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  staticData: { section: 'inicio', mobileHeader: false, mobileTabBar: true },
  component: CatalogPage,
})
