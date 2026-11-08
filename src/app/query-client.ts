import { QueryClient } from '@tanstack/react-query'

/** Cache policy is finalized in T2.4 and documented in ARCHITECTURE.md. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
    },
  },
})
