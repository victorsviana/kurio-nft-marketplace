import { Skeleton } from '@/components/ui/skeleton'
import { RelatedSkeleton } from './related-section'

/**
 * Loading state with the same boxes as the real layout (GEN-05), so nothing jumps when the
 * data arrives. The shimmer stops under prefers-reduced-motion (global rule in index.css).
 */
export function DetailSkeleton({ desktop }: { desktop: boolean }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" data-testid="nft-detail-skeleton">
      <span className="sr-only">Carregando NFT…</span>
      {desktop ? <DesktopSkeleton /> : <MobileSkeleton />}
    </div>
  )
}

function DesktopSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="container-page pt-6">
        <Skeleton className="h-4 w-36" />
        <div className="mt-3 flex flex-col gap-8 xl:flex-row">
          <div className="flex h-[448px] w-[573px] max-w-full shrink-0 gap-7">
            <div className="flex w-[100px] shrink-0 flex-col gap-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="size-[100px] rounded-lg" />
              ))}
            </div>
            <Skeleton className="size-[444px] shrink-0 self-center" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 xl:h-[448px]">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-8 w-72" />
              <div className="flex justify-between">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-16 w-full max-w-[574px]" />
            </div>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-52 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-[50px] w-28" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-[130px]" />
                <Skeleton className="h-10 w-[130px]" />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-5 w-72" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
      </div>
      <div className="container-page mt-24">
        <div className="flex gap-8 border-b border-brand/30 pb-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="container-page mt-24">
        <Skeleton className="h-4 w-48" />
        <div className="mt-3 h-px bg-brand/30" />
        <div className="mt-8">
          <RelatedSkeleton wide />
        </div>
      </div>
    </div>
  )
}

function MobileSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="bg-[linear-gradient(137.6deg,#241612_12%,#2F1D15_106.6%)] px-7 pt-[23px]">
        <div className="flex justify-between">
          <Skeleton className="size-[35px] rounded-full" />
          <Skeleton className="size-[35px] rounded-full" />
        </div>
        <Skeleton className="mt-2 aspect-[361/356] w-full rounded-[24px]" />
      </div>
      <div className="relative z-10 -mt-[30px] flex flex-col gap-3 rounded-t-[31px] bg-surface px-6 pt-8 pb-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48 bg-ink/40" />
          <Skeleton className="h-[27px] w-20 rounded-full bg-ink/40" />
        </div>
        <Skeleton className="h-[72px] w-full bg-ink/40" />
        <Skeleton className="h-4 w-20 bg-ink/40" />
        <Skeleton className="h-7 w-56 rounded-full bg-ink/40" />
        <Skeleton className="h-5 w-44 bg-ink/40" />
        <Skeleton className="h-5 w-52 bg-ink/40" />
        <Skeleton className="h-5 w-64 bg-ink/40" />
      </div>
      <div className="sticky bottom-0 z-20 mt-10 flex h-[164px] flex-col gap-5 rounded-t-[40px] bg-surface px-6 pt-5 shadow-[0_0_10px_rgba(10,6,4,0.45)]">
        <div className="flex items-center justify-between">
          <Skeleton className="h-[30px] w-32 bg-ink/40" />
          <Skeleton className="h-5 w-24 bg-ink/40" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-[60px] w-[196px] rounded-[40px] bg-ink/40" />
          <Skeleton className="size-[60px] rounded-full bg-ink/40" />
        </div>
      </div>
    </div>
  )
}
