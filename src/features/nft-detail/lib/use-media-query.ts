import { useCallback, useSyncExternalStore } from 'react'

/**
 * Subscribes to a CSS media query. The detail screen renders ONE composition (desktop or
 * mobile) instead of hiding the other with CSS: duplicated trees would duplicate the h1,
 * the buy controls and, worse, download two `priority` artworks (LCP, QA-04).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Tailwind `md` (48rem = 768px): Figma desktop composition from here up. */
export const useIsDesktop = () => useMediaQuery('(min-width: 48rem)')

/** Tailwind `lg` (64rem): room for the 5-card related carousel. */
export const useIsWide = () => useMediaQuery('(min-width: 64rem)')

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
