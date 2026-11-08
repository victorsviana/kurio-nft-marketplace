import { useMatches } from '@tanstack/react-router'

/**
 * Per-route layout options declared with `staticData` on each route file. The deepest match
 * wins. Defaults mirror the Figma: header with divider, no mobile tab bar.
 */
export interface LayoutOptions {
  /** Private route: guarded in `beforeLoad`; an expired session redirects to /login (AUTH-04). */
  requiresAuth?: boolean
  /** Active item in the desktop nav: "Início" or "Mercado". */
  section?: 'inicio' | 'mercado'
  /** Thin divider under the desktop header (absent on the Mercado flow screens). */
  headerDivider?: boolean
  /** Compact header on mobile (screens with their own mobile top bar turn it off). */
  mobileHeader?: boolean
  /** Fixed bottom tab bar on mobile (Mobile / Início). */
  mobileTabBar?: boolean
  /** Global footer below 768px (screens whose mobile frame has no footer turn it off). */
  mobileFooter?: boolean
}

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption extends LayoutOptions {}
}

const DEFAULTS: Required<LayoutOptions> = {
  requiresAuth: false,
  section: 'inicio',
  headerDivider: true,
  mobileHeader: true,
  mobileTabBar: false,
  mobileFooter: true,
}

export function useLayoutOptions(): Required<LayoutOptions> {
  const matches = useMatches()
  return matches.reduce<Required<LayoutOptions>>((acc, match) => ({ ...acc, ...match.staticData }), DEFAULTS)
}
