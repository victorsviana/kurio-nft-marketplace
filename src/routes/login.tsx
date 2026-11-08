import { createFileRoute } from '@tanstack/react-router'
import { LoginScreen } from '@/features/auth/login-screen'
import { redirectIfAuthenticated } from '@/features/auth/lib/navigation'
import { authSearchSchema } from '@/shared/session/auth-search'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  staticData: { section: 'inicio', mobileHeader: false, mobileFooter: false },
  beforeLoad: redirectIfAuthenticated,
  component: LoginRoute,
})

function LoginRoute() {
  return <LoginScreen search={Route.useSearch()} />
}
