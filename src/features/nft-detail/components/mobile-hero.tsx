import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { useRef, type UIEvent } from 'react'
import { NftImage } from '@/components/nft/nft-image'
import { MaskIcon } from '@/components/ui/mask-icon'
import { cn } from '@/lib/utils'
import type { NftDetail } from '@/shared/contracts'
import iconBack from '../assets/mobile-icon-back.svg'
import iconHeart from '../assets/mobile-icon-heart.svg'
import { prefersReducedMotion } from '../lib/use-media-query'

const roundButton =
  'grid size-[35px] place-items-center rounded-full border border-line bg-[#2F1D15] transition-colors hover:border-line-soft'

/**
 * Mobile hero (Figma 15:5536): back + favorite buttons over a swipeable gallery (scroll-snap)
 * with dot buttons. Back uses the history when there is one, otherwise goes to the catalog.
 */
export function MobileHero({
  name,
  images,
  index,
  onIndexChange,
  favorite,
  onToggleFavorite,
}: {
  name: string
  images: NftDetail['images']
  index: number
  onIndexChange: (index: number) => void
  favorite: boolean
  onToggleFavorite: () => void
}) {
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()
  const scroller = useRef<HTMLDivElement>(null)

  function goBack() {
    if (canGoBack) router.history.back()
    else void navigate({ to: '/' })
  }

  function onScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget
    const next = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
    if (next !== index && next >= 0 && next < images.length) onIndexChange(next)
  }

  function showSlide(i: number) {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    onIndexChange(i)
  }

  return (
    <div className="bg-[linear-gradient(137.6deg,#241612_12%,#2F1D15_106.6%)] px-7 pt-[23px]">
      <div className="flex items-center justify-between">
        <button type="button" onClick={goBack} aria-label="Voltar" className={roundButton}>
          <MaskIcon src={iconBack} width={13.17} height={7.33} className="rotate-90 text-fg-muted" />
        </button>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          aria-label={`Favoritar ${name}`}
          className={roundButton}
        >
          {favorite ? (
            <Heart aria-hidden="true" className="size-4 fill-brand-text text-brand-text" />
          ) : (
            <MaskIcon src={iconHeart} width={16} height={14.23} className="text-brand-text" />
          )}
        </button>
      </div>

      <div className="relative mt-2">
        <div
          ref={scroller}
          onScroll={onScroll}
          tabIndex={0}
          role="region"
          aria-roledescription="carrossel"
          aria-label={`Imagens de ${name}`}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[24px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, i) => (
            <div
              key={i}
              className="w-full shrink-0 snap-center"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${images.length}`}
            >
              <NftImage
                src={image.url}
                alt={image.alt}
                priority={i === 0}
                sizes="calc(100vw - 56px)"
                width={361}
                height={356}
                className="aspect-[361/356] w-full rounded-[24px]"
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-[50px] left-1/2 flex -translate-x-1/2 items-center gap-[7px]">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Mostrar imagem ${i + 1} de ${images.length}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => showSlide(i)}
                className={cn(
                  'relative h-[7px] rounded-full bg-brand transition-[width] after:absolute after:-inset-x-[3px] after:-inset-y-3 after:content-[""]',
                  i === index ? 'w-7' : 'w-[7px] opacity-90',
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
