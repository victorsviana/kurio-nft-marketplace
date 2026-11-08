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
        clearPrivateCache(queryClient)
        const { location, matches } = router.state
        const onPrivateRoute = matches.some((match) => match.staticData.requiresAuth)

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
