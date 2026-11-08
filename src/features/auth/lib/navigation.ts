import type { QueryClient } from '@tanstack/react-query'
import { redirect, useNavigate, useRouter, type AnyRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAnnounce } from '@/shared/a11y/announcer'
import type { User } from '@/shared/contracts'
import { ensureUser, safeRedirect } from '@/shared/session/auth'
import type { AuthSearch } from '@/shared/session/auth-search'
import { sessionStore } from '@/shared/session/session-store'

/**
 * `beforeLoad` of /login and /signup: a signed-in user goes straight to `redirect` (or home).
 * `href` (not `to`) because the redirect target may carry its own search params.
 */
export async function redirectIfAuthenticated({
  context,
  search,
}: {
  context: { queryClient: QueryClient }
  search: AuthSearch
}) {
  if (!sessionStore.get()) return
  const { user } = await ensureUser(context.queryClient)
  if (user) throw redirect({ href: safeRedirect(search.redirect), replace: true })
}

/**
 * Closing the modal without signing in returns to where the user came from, unless that place
 * is private: the guard would bounce an anonymous user straight back to /login.
 */
function closeTarget(router: AnyRouter, redirectTo: string | undefined): string {
  const target = safeRedirect(redirectTo)
  const { pathname } = new URL(target, window.location.origin)
  const [routes] = router.getMatchedRoutes(pathname)
  const isPrivate = routes.some((route) => Boolean((route.options as { staticData?: { requiresAuth?: boolean } }).staticData?.requiresAuth))
  return isPrivate ? '/' : target
}

const firstName = (user: User) => user.displayName.trim().split(/\s+/)[0] ?? user.username

/** Where the auth screens go when they finish (AUTH-02 `?redirect=`) or are dismissed. */
export function useAuthExit(search: AuthSearch) {
  const navigate = useNavigate()
  const router = useRouter()
  const announce = useAnnounce()

  /** Success: replace the auth entry with the target, then announce once the page changed. */
  const complete = async (user: User, kind: 'login' | 'signup') => {
    await navigate({ href: safeRedirect(search.redirect), replace: true })
    if (kind === 'signup') {
      // The toast region is a live region: it is announced, so no second announcement here.
      toast.success('Conta criada', { description: `Boas-vindas à Kurio, ${firstName(user)}!` })
    } else {
      announce(`Boas-vindas, ${firstName(user)}! Você entrou na sua conta.`)
    }
  }

  const close = () => {
    void navigate({ href: closeTarget(router, search.redirect), replace: true })
  }

  return { complete, close }
}
