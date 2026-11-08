import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { nftImageSources } from '@/shared/lib/format'

/**
 * NFT artwork with responsive WebP sources (256/512/960). Always pass `sizes` matching the
 * rendered width and explicit width/height to reserve space (no CLS). Use `priority` for the
 * LCP image (hero / detail main image) and leave the rest lazy.
 */
export function NftImage({
  src,
  alt,
  sizes,
  width,
  height,
  priority = false,
  className,
  ...rest
}: Omit<ComponentProps<'img'>, 'src' | 'srcSet' | 'loading'> & {
  src: string
  alt: string
  sizes: string
  width: number
  height: number
  priority?: boolean
}) {
  const sources = nftImageSources(src)
  return (
    <img
      {...rest}
      src={sources.src}
      srcSet={sources.srcSet}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      className={cn('object-cover', className)}
    />
  )
}
