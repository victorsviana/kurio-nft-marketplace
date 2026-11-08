import { createFileRoute } from '@tanstack/react-router'
import { SignupScreen } from '@/features/auth/signup-screen'
import { redirectIfAuthenticated } from '@/features/auth/lib/navigation'
import { authSearchSchema } from '@/shared/session/auth-search'

export const Route = createFileRoute('/signup')({
  validateSearch: authSearchSchema,
  staticData: { section: 'inicio', mobileHeader: false, mobileFooter: false },
  beforeLoad: redirectIfAuthenticated,
  component: SignupRoute,
})

function SignupRoute() {
  return <SignupScreen search={Route.useSearch()} />
}
