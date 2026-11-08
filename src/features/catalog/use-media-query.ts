import { useCallback, useSyncExternalStore } from 'react'

/** Tailwind breakpoints used by the catalog layout. */
export const MEDIA = {
  /** ≥ 768: desktop header, hero and cards. Below: Mobile / Início frame. */
  md: '(min-width: 768px)',
  /** ≥ 1024: filters in the sidebar. Below: filters in a Sheet. */
  lg: '(min-width: 1024px)',
} as const

/**
 * Synchronous media query (the first render already matches the viewport), so only one hero
 * variant mounts and only one priority image is requested.
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

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Brings the catalog section into view (EXPLORAR, page change), respecting reduced motion. */
export function scrollToCatalog() {
  document.getElementById('catalogo')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
}
