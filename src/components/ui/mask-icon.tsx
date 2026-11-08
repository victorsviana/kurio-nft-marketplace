import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * Renders a Figma SVG asset as a CSS mask filled with `currentColor`, so the exact exported
 * shape can follow state colors (active/inactive, hover). Decorative by default.
 */
export function MaskIcon({
  src,
  width,
  height,
  className,
  label,
}: {
  src: string
  width: number
  height: number
  className?: string
  /** Accessible name when the icon is the only content of its control. */
  label?: string
}) {
  const style: CSSProperties = {
    width,
    height,
    WebkitMaskImage: `url("${src}")`,
    maskImage: `url("${src}")`,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
  }
  return (
    <span
      className={cn('inline-block shrink-0 bg-current', className)}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
}
