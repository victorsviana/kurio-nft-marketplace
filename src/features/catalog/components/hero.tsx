import { useQuery } from '@tanstack/react-query'
import { NftImage } from '@/components/nft/nft-image'
import { MaskIcon } from '@/components/ui/mask-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { featuredQuery } from '@/shared/api/endpoints/nfts'
import heroDotsMobile from '../assets/hero-dots-mobile.svg'
import heroDots from '../assets/hero-dots.svg'
import heroMaskMobile from '../assets/hero-mask-mobile.svg'
import iconArrowAccent from '../assets/icon-arrow-right-accent.svg'
import { scrollToCatalog } from '../use-media-query'

/**
 * Desktop hero (1200 × 450): text column of 600 and the hero artwork 450 × 450 r24 from
 * `GET /nfts/featured` (CAT-01). The artwork is the LCP element, so it is the only image with
 * `priority`. Fluid below xl so it never overflows (tablet scales the title and the art).
 */
export function DesktopHero() {
  const { data, isError } = useQuery(featuredQuery())
  const hero = data?.hero
  return (
    <section aria-labelledby="hero-title" className="flex items-center justify-between gap-8 lg:pl-10 xl:h-[450px]">
      <div className="flex max-w-[600px] min-w-0 flex-1 flex-col">
        <p className="text-sm leading-4 font-medium tracking-[1.4px] text-fg">Bem-vindo à Kurio</p>
        <h1
          id="hero-title"
          className="mt-2.5 text-[28px] leading-[44px] font-bold text-fg lg:text-[38px] lg:leading-[62px] xl:text-[43px] xl:leading-[70px]"
        >
          SEJA DONO DO FUTURO
          <br />
          DA ARTE DIGITAL
        </h1>
        <p className="mt-0.5 max-w-[557px] text-sm leading-6 text-fg-muted">
          Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas
          e tenha uma parte da cultura da internet.
        </p>
        <button
          type="button"
          onClick={scrollToCatalog}
          className="mt-8 h-10 w-[140px] rounded-md bg-brand text-base font-bold text-ink transition-colors hover:bg-brand-text"
        >
          EXPLORAR
        </button>
        <img src={heroDots} alt="" aria-hidden="true" width={40} height={8} className="mt-11 self-end" />
      </div>
      <div className="aspect-square w-[42%] max-w-[450px] shrink-0 overflow-hidden rounded-3xl">
        {hero ? (
          <NftImage
            src={hero.image}
            alt={`Arte do NFT ${hero.name}`}
            width={450}
            height={450}
            sizes="(min-width: 1280px) 450px, 42vw"
            priority
            className="size-full"
          />
        ) : isError ? (
          <div className="size-full bg-surface" />
        ) : (
          <Skeleton className="size-full rounded-3xl" />
        )}
      </div>
    </section>
  )
}

/** Mobile hero (366 × 190): gradient card with two overlapping artworks (Mobile / Início). */
export function MobileHero() {
  const { data, isError } = useQuery(featuredQuery())
  return (
    <section aria-labelledby="hero-title" className="relative flex min-h-[190px] flex-col justify-center px-4 py-1">
      <img src={heroMaskMobile} alt="" aria-hidden="true" className="absolute inset-0 size-full" />
      <div className="relative flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-xs leading-4 font-medium text-fg">Bem-vindo à Kurio</p>
          <h1 id="hero-title" className="text-lg leading-[29px] font-bold text-fg">
            SEJA DONO DA
            <br />
            CULTURA DIGITAL
          </h1>
          <p className="text-xs leading-[18px] text-fg-muted">Descubra NFTs selecionados de criadores do mundo todo.</p>
          <button
            type="button"
            onClick={scrollToCatalog}
            className="-my-1 flex items-center gap-2 self-start rounded-sm py-1 text-xs leading-[14px] font-bold text-brand-text"
          >
            EXPLORAR
            <MaskIcon src={iconArrowAccent} width={10} height={12} className="-rotate-90" />
          </button>
        </div>
        {/* 138 px in the 414 frame; shrinks a little on narrower phones so the title keeps 2 lines. */}
        <div className="relative mt-1 size-(--art) shrink-0 [--art:clamp(112px,calc(100vw-263px),138px)]">
          {data ? (
            <>
              <NftImage
                src={data.hero.image}
                alt={`Arte do NFT ${data.hero.name}`}
                width={138}
                height={138}
                sizes="138px"
                priority
                className="size-(--art) rounded-2xl"
              />
              <NftImage
                src={data.spotlight.image}
                alt={`Arte do NFT ${data.spotlight.name}`}
                width={58}
                height={58}
                sizes="58px"
                className="absolute top-[calc(var(--art)*0.638)] left-[calc(var(--art)*0.1)] size-[calc(var(--art)*0.42)] rounded-2xl"
              />
            </>
          ) : isError ? (
            <div className="size-(--art) rounded-2xl bg-surface" />
          ) : (
            <Skeleton className="size-(--art) rounded-2xl" />
          )}
        </div>
      </div>
      <img src={heroDotsMobile} alt="" aria-hidden="true" width={33} height={7} className="relative mx-auto mt-4" />
    </section>
  )
}
