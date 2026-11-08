import { createFileRoute } from '@tanstack/react-router'
import { FavoritesScreen } from '@/features/favorites/favorites-screen'
import { requireUser } from '@/shared/session/guards'

export const Route = createFileRoute('/favorites')({
  beforeLoad: requireUser,
  staticData: { section: 'inicio', requiresAuth: true, mobileTabBar: true },
  component: FavoritesScreen,
})
