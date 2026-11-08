import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react'

type Politeness = 'polite' | 'assertive'
type Announce = (message: string, politeness?: Politeness) => void

const AnnouncerContext = createContext<Announce>(() => {})

/**
 * Screen-reader announcements for mutations and realtime changes (A11Y-04). Two visually
 * hidden live regions; the text is cleared first so repeating the same message is announced.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState('')
  const [assertive, setAssertive] = useState('')
  // One timer per region, so a polite message is not dropped by an assertive one right after it.
  const timers = useRef<Record<Politeness, number | undefined>>({ polite: undefined, assertive: undefined })

  const announce = useCallback<Announce>((message, politeness = 'polite') => {
    const set = politeness === 'assertive' ? setAssertive : setPolite
    set('')
    window.clearTimeout(timers.current[politeness])
    timers.current[politeness] = window.setTimeout(() => set(message), 60)
  }, [])

  const value = useMemo(() => announce, [announce])

  return (
    <AnnouncerContext value={value}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="live-region-polite">
        {polite}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true" data-testid="live-region-assertive">
        {assertive}
      </div>
    </AnnouncerContext>
  )
}

export function useAnnounce(): Announce {
  return use(AnnouncerContext)
}
