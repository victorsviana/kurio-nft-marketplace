import { useSyncExternalStore } from 'react'

/** Tailwind `md` breakpoint: the auth screens are a modal from here up, a full page below. */
const DESKTOP_QUERY = '(min-width: 768px)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

const getSnapshot = () => window.matchMedia(DESKTOP_QUERY).matches

/**
 * Picks one presentation in JS instead of hiding one with CSS: a hidden Radix modal would
 * still trap focus and hide the page from assistive tech, and duplicated inputs would break
 * label lookups.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
