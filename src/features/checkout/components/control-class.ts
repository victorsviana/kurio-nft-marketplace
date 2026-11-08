import { cn } from '@/lib/utils'

/** Figma input: h 40, 1px Color/Border, radius 3, no fill, placeholder Color/Secondary. */
export const controlClass = cn(
  'h-10 w-full min-w-0 rounded-[3px] border border-line bg-transparent pl-3 pr-2 text-sm leading-[15px] text-fg outline-none transition-colors',
  'placeholder:text-fg-subtle focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25',
  'aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/25 disabled:opacity-60',
)
