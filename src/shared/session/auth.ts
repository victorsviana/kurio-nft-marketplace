import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toApiError } from '@/shared/api/errors'
import { apiRequest, apiRequestVoid } from '@/shared/api/request'
import { queryKeys } from '@/shared/api/query-keys'
import { authResponseSchema, type AuthResponse, type LoginInput, type RegisterInput, type User } from '@/shared/contracts'
import { sessionStore, useStoredSession } from './session-store'

/**
 * Session API (AUTH-01..AUTH-05). The token lives in `sessionStore`; the user comes from
 * `GET /auth/session`, cached per token, so a refresh restores the session (AUTH-03).
 */

export const sessionQuery = (token: string) =>
  queryOptions({
    queryKey: queryKeys.session(token),
    queryFn: ({ signal }) => apiRequest(authResponseSchema, { url: '/auth/session', signal }),
    staleTime: 5 * 60_000,
    retry: false,
  })

export type AuthState =
  | { status: 'anonymous'; user: null }
  | { status: 'loading'; user: null }
  | { status: 'authenticated'; user: User; token: string }

export function useAuth(): AuthState {
  const stored = useStoredSession()
  const query = useQuery({ ...sessionQuery(stored?.token ?? ''), enabled: Boolean(stored) })
  if (!stored) return { status: 'anonymous', user: null }
  if (query.data && query.data.user.id === stored.userId) {
    return { status: 'authenticated', user: query.data.user, token: stored.token }
  }
  if (query.isError) return { status: 'anonymous', user: null }
  return { status: 'loading', user: null }
}

export type EnsureUserResult = { user: User; expired: false } | { user: null; expired: boolean }

/**
 * Router guard helper. Revalidates the session with the server on private navigations (at most
 * every 10s), so an expired session is detected while navigating, not only on the next write
 * (AUTH-04). Never throws.
 */
export async function ensureUser(queryClient: QueryClient): Promise<EnsureUserResult> {
  const stored = sessionStore.get()
  if (!stored) return { user: null, expired: false }
  try {
    const { user } = await queryClient.fetchQuery({ ...sessionQuery(stored.token), staleTime: 10_000 })
    return { user, expired: false }
  } catch (error) {
    return { user: null, expired: toApiError(error).code === 'SESSION_EXPIRED' }
  }
}

function startSession(queryClient: QueryClient, response: AuthResponse) {
  queryClient.setQueryData(queryKeys.session(response.session.token), response)
  sessionStore.start({
    token: response.session.token,
    expiresAt: response.session.expiresAt,
    userId: response.user.id,
  })
}

/** Removes every private cache entry (session, `me` tree, carts). Called when a session ends. */
export function clearPrivateCache(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: ['session'] })
  queryClient.removeQueries({ queryKey: queryKeys.me.all })
  queryClient.removeQueries({ queryKey: queryKeys.cart.all })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => apiRequest(authResponseSchema, { method: 'POST', url: '/auth/login', data: input }),
    onSuccess: (response) => startSession(queryClient, response),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      apiRequest(authResponseSchema, { method: 'POST', url: '/auth/register', data: input }),
    onSuccess: (response) => startSession(queryClient, response),
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      try {
        await apiRequestVoid({ method: 'POST', url: '/auth/logout' })
      } catch {
        // Logging out must always succeed locally, even offline.
      }
    },
    onSettled: () => sessionStore.end('logout'),
  })
}

/** Accepts only same-origin relative paths for `?redirect=` (prevents open redirects). */
export function safeRedirect(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  if (/^\/(login|signup)(\?|$|\/)/.test(value)) return fallback
  return value
}
