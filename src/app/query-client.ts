import { QueryClient } from '@tanstack/react-query'
import { toApiError } from '@/shared/api/errors'

/**
 * Cache policy (documented in ARCHITECTURE.md):
 * - staleTime 30s: catalog data changes through realtime events, which patch the cache, so
 *   frequent refetches are unnecessary; focus refetch keeps long-idle tabs honest.
 * - retries only for transient failures (offline, timeout, 5xx), at most 2, with backoff.
 *   4xx (validation, auth, not found, conflicts) never retry.
 * - mutations never retry automatically: non-idempotent writes must not be repeated blindly;
 *   orders use an Idempotency-Key instead (CHK-06).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => failureCount < 2 && toApiError(error).isRetryable,
      retryDelay: (attempt) => Math.min(600 * 2 ** attempt, 4_000),
    },
    mutations: { retry: false },
  },
})
