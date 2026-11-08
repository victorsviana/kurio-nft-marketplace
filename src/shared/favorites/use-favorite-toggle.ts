import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { useAnnounce } from '@/shared/a11y/announcer'
import { favoritesQuery, setFavorite } from '@/shared/api/endpoints/account'
import { toApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/query-keys'
import type { FavoritesResponse } from '@/shared/contracts'
import { useAuth } from '@/shared/session/auth'

/**
 * Single entry point for the "Favoritar" buttons (catalog cards, detail page, favorites page).
 * - Visitors are sent to /login and come back to the same URL afterwards (FAV-03).
 * - Authenticated users get an optimistic update (FAV-02): the heart flips immediately, the
 *   request runs, and a failure rolls back ONLY that NFT (a concurrent toggle of another NFT is
 *   kept) and is announced. The server answer then replaces the list (FAV-01).
 */
export function useFavoriteToggle() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const announce = useAnnounce()
  const userId = auth.status === 'authenticated' ? auth.user.id : null

  const favorites = useQuery({ ...favoritesQuery(userId ?? ''), enabled: Boolean(userId) })
  const key = queryKeys.me.favorites(userId ?? '')

  const mutation = useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean; name?: string }) => setFavorite(nftId, favorite),
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      queryClient.setQueryData<FavoritesResponse>(key, (old) => applyToggle(old, nftId, favorite))
    },
    onError: (error, { nftId, favorite, name }) => {
      // Per-NFT rollback: restore the opposite state of this NFT only.
      queryClient.setQueryData<FavoritesResponse>(key, (old) => applyToggle(old, nftId, !favorite))
      const message = `Não foi possível ${favorite ? 'favoritar' : 'remover dos favoritos'}${name ? ` ${name}` : ''}. ${toApiError(error).message}`
      toast.error(message)
      announce(message, 'assertive')
    },
    onSuccess: (response, { favorite, name }) => {
      // Only adopt the server list when no other toggle is still in flight, otherwise its
      // optimistic state would be overwritten by this (older) answer.
      if (queryClient.isMutating({ mutationKey: ['favorite-toggle', userId] }) <= 1) queryClient.setQueryData(key, response)
      announce(favorite ? `${name ?? 'NFT'} adicionado aos favoritos.` : `${name ?? 'NFT'} removido dos favoritos.`)
    },
    mutationKey: ['favorite-toggle', userId],
  })

  const ids = favorites.data?.nftIds
  const isFavorite = useCallback((nftId: string) => ids?.includes(nftId) ?? false, [ids])

  const toggle = useCallback(
    (nftId: string, name?: string) => {
      if (auth.status !== 'authenticated') {
        void navigate({ to: '/login', search: { redirect: location.href } })
        return
      }
      mutation.mutate({ nftId, favorite: !isFavorite(nftId), name })
    },
    [auth.status, navigate, location.href, mutation, isFavorite],
  )

  return { isFavorite, toggle, pending: mutation.isPending, favorites }
}

function applyToggle(old: FavoritesResponse | undefined, nftId: string, favorite: boolean): FavoritesResponse | undefined {
  if (!old) return old
  const has = old.nftIds.includes(nftId)
  if (favorite === has) return old
  return favorite
    ? { ...old, nftIds: [nftId, ...old.nftIds] }
    : { nftIds: old.nftIds.filter((id) => id !== nftId), items: old.items.filter((item) => item.id !== nftId) }
}
