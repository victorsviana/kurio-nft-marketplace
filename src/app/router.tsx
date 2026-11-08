import { createRouter, parseSearchWith, stringifySearchWith } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { queryClient } from './query-client'

/**
 * Search params are kept as raw strings (no JSON encoding), so catalog URLs read like
 * `/?q=ape&category=music,3d-art&page=2` and each route validates them with zod. The same
 * schema validates the API query in the mock handler (CAT-06).
 */
const parseValue = (value: string) => value
const stringifyValue = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value))

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  parseSearch: parseSearchWith(parseValue),
  stringifySearch: stringifySearchWith(stringifyValue, parseValue),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
