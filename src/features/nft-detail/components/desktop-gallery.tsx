import { X } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'
import { NftImage } from '@/components/nft/nft-image'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { NftDetail } from '@/shared/contracts'
import iconZoom from '../assets/icon-zoom.svg'

/**
 * Desktop gallery (573 × 448): 4 thumbnail buttons + main artwork 404 in a 444 card, zoom
 * button opening the artwork in a dialog (NFT-01). Thumbnails are a single group operable with
 * Tab and the arrow keys; the selected one carries `aria-pressed` and the Primary border.
 */
export function DesktopGallery({
  name,
  images,
  index,
  onIndexChange,
}: {
  name: string
  images: NftDetail['images']
  index: number
  onIndexChange: (index: number) => void
}) {
  const thumbs = useRef<(HTMLButtonElement | null)[]>([])
  const current = images[index] ?? images[0]!

  function onThumbKey(event: KeyboardEvent<HTMLButtonElement>, i: number) {
    const delta = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key]
    let next: number | undefined
    if (delta !== undefined) next = (i + delta + images.length) % images.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = images.length - 1
    if (next === undefined) return
    event.preventDefault()
    onIndexChange(next)
    thumbs.current[next]?.focus()
  }

  return (
    <div className="flex h-[448px] w-[573px] max-w-full shrink-0 gap-7">
      <div role="group" aria-label="Imagens do NFT" className="flex w-[100px] shrink-0 flex-col gap-4">
        {images.map((image, i) => (
          <button
            key={i}
            ref={(el) => {
              thumbs.current[i] = el
            }}
            type="button"
            aria-label={`Mostrar imagem ${i + 1} de ${images.length}`}
            aria-pressed={i === index}
            onClick={() => onIndexChange(i)}
            onKeyDown={(event) => onThumbKey(event, i)}
            className={cn(
              'size-[100px] shrink-0 overflow-hidden rounded-lg border bg-surface transition-colors',
              i === index ? 'border-brand' : 'border-transparent hover:border-line-soft',
            )}
          >
            <NftImage src={image.url} alt="" sizes="100px" width={100} height={100} className="size-full" />
          </button>
        ))}
      </div>

      <div className="relative size-[444px] shrink-0 self-center rounded-md bg-surface p-5">
        <NftImage
          src={current.url}
          alt={current.alt}
          priority
          sizes="404px"
          width={404}
          height={404}
          className="size-full rounded-[24px]"
          data-testid="gallery-main-image"
        />
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Ampliar imagem"
              className="absolute top-[15px] right-[14px] grid size-[30px] place-items-center rounded-full transition-transform hover:scale-110"
            >
              <img src={iconZoom} alt="" width={30} height={30} />
            </button>
          </DialogTrigger>
          <DialogContent
            showCloseButton={false}
            aria-describedby={undefined}
            className="w-[min(92vw,820px)] max-w-none gap-3 border border-line bg-surface p-3 ring-0 sm:max-w-none"
          >
            <div className="flex items-center justify-between gap-4 pl-1">
              <DialogTitle className="text-base font-bold text-fg">
                {name} <span className="font-normal text-fg-muted">— imagem {index + 1} de {images.length}</span>
              </DialogTitle>
              <DialogClose className="grid size-9 place-items-center rounded-md text-fg-muted hover:bg-ink/40 hover:text-fg">
                <X aria-hidden="true" className="size-5" />
                <span className="sr-only">Fechar</span>
              </DialogClose>
            </div>
            <NftImage
              src={current.url}
              alt={current.alt}
              sizes="min(92vw, 820px)"
              width={960}
              height={960}
              className="aspect-square max-h-[80dvh] w-full rounded-[18px] object-contain"
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
