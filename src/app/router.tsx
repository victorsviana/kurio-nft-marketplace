import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { queryClient } from './query-client'

/**
 * Search params are kept as raw strings: no JSON encoding and no type coercion (the default
 * decoder would turn "0.5" or "2024" into numbers before validation). Each route validates
 * them with zod, and the same catalog schema validates the API query in the mock handler
 * (CAT-06). Commas stay readable so URLs look like `/?category=music,3d-art&page=2`.
 */
function parseSearch(searchStr: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(searchStr))
}

function stringifySearch(search: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '') continue
    const text = typeof value === 'string' ? value : typeof value === 'object' ? JSON.stringify(value) : String(value)
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(text).replace(/%2C/gi, ',')}`)
  }
  return parts.length ? `?${parts.join('&')}` : ''
}

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  parseSearch,
  stringifySearch,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
