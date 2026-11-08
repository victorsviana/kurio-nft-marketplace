import axios from 'axios'
import { config } from '@/shared/config'
import { getGuestCartId } from '@/shared/session/guest-cart'
import { sessionStore } from '@/shared/session/session-store'
import { toApiError } from './errors'

/**
 * Single Axios instance for every REST call (constitution §1).
 * - request: bearer token of the current session + the visitor cart id;
 * - response: every failure is normalized into `ApiError`; a 401 for the token that was
 *   actually sent ends the session, so stale responses from a previous user cannot log out
 *   the next one (AUTH-04, AUTH-05).
 * Response bodies are validated against the zod contracts in `request.ts`.
 */
export const http = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 10_000,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use((request) => {
  const token = sessionStore.getToken()
  if (token) request.headers.set('Authorization', `Bearer ${token}`)
  request.headers.set('X-Guest-Cart-Id', getGuestCartId())
  return request
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    if (apiError.status === 401 && axios.isAxiosError(error)) {
      const sentAuth = error.config?.headers?.get?.('Authorization')
      const currentToken = sessionStore.getToken()
      if (typeof sentAuth === 'string' && currentToken && sentAuth === `Bearer ${currentToken}`) {
        const reason = apiError.code === 'SESSION_EXPIRED' ? 'expired' : apiError.code === 'UNAUTHENTICATED' ? 'invalid' : null
        // Deferred to the next task so this rejection reaches its caller first. Ending the
        // session synchronously re-keys the session observers; TanStack Query then cancels the
        // in-flight query with `revert: true` and `fetchQuery` resolves with the stale user,
        // which made route guards let an expired session through.
        if (reason) window.setTimeout(() => {
          if (sessionStore.getToken() === currentToken) sessionStore.end(reason)
        }, 0)
      }
    }
    return Promise.reject(apiError)
  },
)
