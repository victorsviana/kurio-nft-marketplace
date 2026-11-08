import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { useAnnounce } from '@/shared/a11y/announcer'
import { clearPrivateCache } from '@/shared/session/auth'
import { sessionStore } from '@/shared/session/session-store'

/**
 * Reacts to the end of a session (logout, expiry, invalid token, user switch, other tab):
 * - removes every private cache entry (AUTH-05); the realtime provider reconnects on its own
 *   because the token changed;
 * - on expiry inside a private screen, goes to /login keeping the current URL in `redirect`
 *   so the user resumes exactly where they were (AUTH-04);
 * - on logout inside a private screen, goes home.
 */
export function SessionSync() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const announce = useAnnounce()

  useEffect(
    () =>
      sessionStore.onEnd((reason) => {
        // Deferred by a task: the 401 that ended the session may belong to a request a route
        // guard is still awaiting; removing its query synchronously would turn that 401 into a
        // cancellation and the guard would lose `reason=expired`.
        window.setTimeout(() => clearPrivateCache(queryClient), 0)
        const { location, matches, status } = router.state
        // While a navigation is pending, the route guard owns the redirect (it knows the target URL).
        const onPrivateRoute = status === 'idle' && matches.some((match) => match.staticData.requiresAuth)

        if (reason === 'expired') {
          const message = 'Sua sessão expirou. Entre novamente para continuar.'
          announce(message, 'assertive')
          toast.warning(message)
          if (onPrivateRoute) {
            void router.navigate({ to: '/login', search: { redirect: location.href, reason: 'expired' } })
          }
          return
        }
        if (onPrivateRoute) void router.navigate({ to: '/' })
      }),
    [queryClient, router, announce],
  )

  return null
}
