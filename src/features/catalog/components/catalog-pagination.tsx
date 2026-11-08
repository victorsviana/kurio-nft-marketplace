import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { MaskIcon } from '@/components/ui/mask-icon'
import { cn } from '@/lib/utils'
import iconChevron from '../assets/icon-chevron-right.svg'
import { scrollToCatalog } from '../use-media-query'

/** Window of 4 consecutive pages around the current one, like the Figma ("1 2 3 4 >"). */
function pageWindow(page: number, totalPages: number, size = 4): number[] {
  const start = Math.max(1, Math.min(page - 1, totalPages - size + 1))
  const end = Math.min(totalPages, start + size - 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

const itemClass =
  'grid size-[35px] place-items-center rounded-[4px] border text-lg leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

function PageLink({ page, label, current, children }: { page: number; label: string; current?: boolean; children: ReactNode }) {
  return (
    <Link
      to="/"
      search={(prev) => ({ ...prev, page: page > 1 ? page : undefined })}
      resetScroll={false}
      preload={false}
      onClick={scrollToCatalog}
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      className={cn(
        itemClass,
        current ? 'border-brand bg-brand font-bold text-ink' : 'border-line font-normal text-fg hover:border-brand hover:text-brand-text',
      )}
    >
      {children}
    </Link>
  )
}

/** Pagination (CAT-05): real links, so `?page=` is shareable and history works. */
export function CatalogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Paginação do catálogo" className="flex justify-center md:justify-end">
      <ul className="flex items-center gap-2">
        {page > 1 && (
          <li>
            <PageLink page={page - 1} label="Página anterior">
              <MaskIcon src={iconChevron} width={12} height={7} className="rotate-90" />
            </PageLink>
          </li>
        )}
        {pageWindow(page, totalPages).map((p) => (
          <li key={p}>
            <PageLink page={p} label={`Página ${p}`} current={p === page}>
              {p}
            </PageLink>
          </li>
        ))}
        {page < totalPages && (
          <li>
            <PageLink page={page + 1} label="Próxima página">
              <MaskIcon src={iconChevron} width={12} height={7} className="-rotate-90" />
            </PageLink>
          </li>
        )}
      </ul>
    </nav>
  )
}
