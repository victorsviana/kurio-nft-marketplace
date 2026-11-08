import { Skeleton } from '@/components/ui/skeleton'
import { SummaryValuesSkeleton } from './cart-summary'

/**
 * First-load placeholders with the boxes of the real layout (GEN-05): 70 px table lines and
 * the summary column on desktop, 100 px cards and the bottom panel on mobile. The shimmer
 * stops under prefers-reduced-motion (global rule in index.css).
 */
export function CartLinesSkeleton({ desktop }: { desktop: boolean }) {
  if (!desktop) {
    return (
      <div className="flex flex-col gap-5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-[100px] overflow-hidden rounded-[14px] bg-surface">
            <Skeleton className="size-[100px] shrink-0 rounded-none rounded-l-[14px] bg-line/40" />
            <div className="flex flex-1 flex-col gap-2 pt-[13px] pl-[9px]">
              <Skeleton className="h-4 w-32 bg-ink/40" />
              <Skeleton className="h-4 w-20 bg-ink/40" />
              <Skeleton className="mt-auto mb-[15px] h-4 w-16 bg-ink/40" />
            </div>
            <Skeleton className="mt-[38px] mr-3 h-6 w-[76px] rounded-full bg-ink/40" />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div aria-hidden="true">
      <div className="flex justify-between border-b border-brand/30 pr-12 pb-3">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-[70px] items-center gap-4 bg-surface pr-6">
            <Skeleton className="size-[70px] shrink-0 rounded-[6px] bg-line/40" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-36 bg-ink/40" />
              <Skeleton className="h-4 w-28 bg-ink/40" />
            </div>
            <Skeleton className="h-4 w-20 bg-ink/40" />
            <Skeleton className="ml-[8%] h-[30px] w-[76px] bg-ink/40" />
            <Skeleton className="ml-[8%] h-4 w-20 bg-ink/40" />
            <Skeleton className="ml-[6%] size-6 bg-ink/40" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CartSummarySkeleton({ desktop }: { desktop: boolean }) {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      {desktop && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-44" />
          <div className="h-px bg-brand/30" />
        </div>
      )}
      <div className="flex flex-col gap-2">
        {desktop && <Skeleton className="h-4 w-36" />}
        <Skeleton className={desktop ? 'h-10 w-full rounded-[3px]' : 'h-[50px] w-full rounded-[40px] bg-ink/40'} />
      </div>
      <SummaryValuesSkeleton />
      <Skeleton className={desktop ? 'h-10 w-full rounded-[3px]' : 'h-[60px] w-full rounded-[40px] bg-ink/40'} />
    </div>
  )
}
