import { useCallback, useSyncExternalStore } from 'react'

const QUERY = '(min-width: 48rem)'

/**
 * Tailwind `md` (768px): desktop composition from here up. The screen renders ONE composition
 * instead of hiding the other with CSS, so ids, labels and the form exist once.
 */
export function useIsDesktop(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const list = window.matchMedia(QUERY)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [])
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  )
}
