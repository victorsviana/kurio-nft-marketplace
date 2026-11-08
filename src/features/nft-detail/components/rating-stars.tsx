import { MaskIcon } from '@/components/ui/mask-icon'
import { cn } from '@/lib/utils'
import iconStar from '../assets/icon-star.svg'
import { formatRating } from '../lib/editions'

const STAR_RATIO = 11.8758 / 12.5017

/**
 * Five stars with fractional fill: Primary for the filled part, Text/Secondary for the rest
 * (`icon-star.svg` / `icon-star-last.svg` in the Figma). Exposed as one image with the score.
 */
export function RatingStars({
  rating,
  size = 13,
  gap = 4,
  className,
}: {
  rating: number
  size?: number
  gap?: number
  className?: string
}) {
  const height = size * STAR_RATIO
  return (
    <span
      role="img"
      aria-label={`Nota ${formatRating(rating)} de 5`}
      className={cn('inline-flex shrink-0 items-center', className)}
      style={{ gap }}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.min(1, Math.max(0, rating - i))
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height }}>
            <MaskIcon src={iconStar} width={size} height={height} className="absolute inset-0 text-fg-muted" />
            {fill > 0 && (
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <MaskIcon src={iconStar} width={size} height={height} className="text-brand" />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}
