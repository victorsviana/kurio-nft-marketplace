import { redirect, type ParsedLocation } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { ensureUser } from './auth'

/**
 * `beforeLoad` guard for private routes (AUTH-06, CHK-01): without a valid session the user
 * goes to /login with the requested URL in `redirect`, and comes back after signing in.
 */
export async function requireUser({ context, location }: { context: { queryClient: QueryClient }; location: ParsedLocation }) {
  const result = await ensureUser(context.queryClient)
  if (!result.user) {
    throw redirect({ to: '/login', search: { redirect: location.href, reason: result.expired ? 'expired' : undefined } })
  }
  return { user: result.user }
}
