import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import iconClose from '../assets/icon-close.svg'

/**
 * The 578px card of the Figma modal (node 70376:239), rendered as a routed page: dark
 * backdrop, card centered (top ≈ 166px at 1440 including the header), 10px brand bar at
 * the bottom. Below 768px it takes the full width with a 16px gutter.
 *
 * A page section instead of a Radix dialog on purpose: the route is reachable by URL and
 * refresh (GEN-02), and a modal would set aria-hidden on the global live regions.
 */
export function OrderFrame({
  labelledBy,
  children,
  className,
  busy,
  testId,
  status,
}: {
  labelledBy?: string
  children: ReactNode
  className?: string
  busy?: boolean
  testId?: string
  status?: string
}) {
  return (
    <div className="px-4 pt-6 pb-16 md:pt-[90px] md:pb-24">
      <section
        aria-labelledby={labelledBy}
        aria-busy={busy || undefined}
        data-testid={testId}
        data-status={status}
        className={cn('relative mx-auto w-full max-w-[578px] bg-surface', className)}
      >
        <Link
          to="/"
          aria-label="Fechar e voltar ao início"
          className="absolute top-[9px] right-[6px] z-10 grid size-8 place-items-center rounded-md"
        >
          <img src={iconClose} alt="" width={18} height={17} aria-hidden="true" />
        </Link>
        {children}
        <div aria-hidden="true" className="h-2.5 bg-brand" />
      </section>
    </div>
  )
}

export function Rule({ soft = false }: { soft?: boolean }) {
  return <div aria-hidden="true" className={cn('h-px', soft ? 'bg-brand/40' : 'bg-brand')} />
}

export interface MetaEntry {
  label: string
  value: ReactNode
  strong?: boolean
  /** Full value for hover/assistive tech when `value` is abbreviated. */
  title?: string
}

/**
 * Meta row: 4 columns separated by 31px vertical rules on desktop; a 2×2 grid on small screens
 * (no horizontal overflow at 390).
 */
export function MetaRow({ entries }: { entries: MetaEntry[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 py-4 md:flex md:h-[65px] md:items-center md:justify-between md:gap-0 md:px-9 md:py-1">
      {entries.map((entry, index) => (
        <div
          key={entry.label}
          className={cn(
            'relative flex min-w-0 flex-col gap-0.5 text-fg-muted',
            // Vertical rule 17px before each column after the first (Figma meta-divider).
            index > 0 &&
              'md:before:absolute md:before:top-1/2 md:before:-left-[17px] md:before:h-[31px] md:before:w-px md:before:-translate-y-1/2 md:before:bg-brand',
          )}
        >
          <dt className={cn('text-sm leading-4', entry.strong ? 'font-bold' : 'font-normal')}>{entry.label}</dt>
          <dd className="truncate text-[15px] leading-5" title={entry.title}>
            {entry.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
