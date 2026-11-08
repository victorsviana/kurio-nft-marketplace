import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Loading placeholder with the shimmer effect (GEN-05). Give it the exact dimensions of the
 * content it replaces to avoid layout shift. The shimmer stops under prefers-reduced-motion
 * (global rule in index.css).
 */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div aria-hidden="true" data-slot="skeleton" className={cn('skeleton-shimmer rounded-md', className)} {...props} />
}
