import { useLocation, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { comingSoon } from '@/shared/lib/coming-soon'
import { useAuth } from '@/shared/session/auth'

/**
 * Single entry point for the "Favoritar" buttons (catalog cards, detail page).
 * - Visitors are sent to /login and come back to the same URL afterwards (FAV-03).
 * - Authenticated users: persistence with optimistic update + rollback lands in Checkpoint 3
 *   (FAV-01, FAV-02); until then this is the only place to change.
 */
export function useFavoriteToggle() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isFavorite = useCallback((nftId: string) => {
    void nftId
    return false
  }, [])

  const toggle = useCallback(
    (nftId: string) => {
      void nftId
      if (auth.status !== 'authenticated') {
        void navigate({ to: '/login', search: { redirect: location.href } })
        return
      }
      comingSoon('Favoritos')
    },
    [auth.status, navigate, location.href],
  )

  return { isFavorite, toggle, pending: false }
}
