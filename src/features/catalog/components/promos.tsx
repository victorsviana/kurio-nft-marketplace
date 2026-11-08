import { Link } from '@tanstack/react-router'
import { NftImage } from '@/components/nft/nft-image'
import { MaskIcon } from '@/components/ui/mask-icon'
import type { CatalogSearch } from '@/shared/contracts'
import iconArrow from '../assets/icon-arrow-right.svg'
import promoMask from '../assets/promo-mask.svg'
import { scrollToCatalog } from '../use-media-query'

/* The Figma promo art reuses the catalog artworks (only 4 distinct artworks exist). */
const PROMOS: {
  title: [string, string]
  text: string
  image: string
  imageAlt: string
  search: CatalogSearch
  cta: string
}[] = [
  {
    title: ['Lançamentos gênesis', 'de edição limitada'],
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: '/images/nft/emerald-ape-512.webp',
    imageAlt: 'Macaco de óculos redondos e jaqueta universitária verde',
    search: { tab: 'new' },
    cta: 'Explorar novos lançamentos',
  },
  {
    title: ['Arte digital selecionada', 'e muito mais'],
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: '/images/nft/neon-vessel-512.webp',
    imageAlt: 'Macaco de blazer marfim e gola alta verde',
    search: { category: 'digital-art' },
    cta: 'Explorar arte digital',
  },
]

/** Promos (2 cards 586 × 250). "Explorar" opens a real catalog filter (`tab=new`, `category=digital-art`). */
export function Promos() {
  return (
    <section aria-label="Destaques do mercado" className="grid gap-6 xl:grid-cols-2 xl:gap-7">
      {PROMOS.map((promo) => (
        <article key={promo.cta} className="relative flex flex-col overflow-hidden rounded-lg bg-surface sm:min-h-[250px] sm:flex-row">
          <NftImage
            src={promo.image}
            alt={promo.imageAlt}
            width={287}
            height={250}
            sizes="(min-width: 768px) 287px, (min-width: 640px) 40vw, 100vw"
            className="h-[180px] w-full shrink-0 rounded-[18px] sm:h-[250px] sm:w-[40%] md:w-[287px]"
          />
          <img src={promoMask} alt="" aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 hidden h-full w-[586px] max-w-none sm:block" />
          <div className="relative flex min-w-0 flex-1 flex-col items-end justify-center gap-2 px-4 py-5 text-right sm:pl-3 md:pr-[30px] md:pl-0">
            <h3 className="text-base leading-6 font-bold text-fg md:text-lg md:leading-6 md:whitespace-nowrap">
              {promo.title[0]}
              <br />
              {promo.title[1]}
            </h3>
            <p className="max-w-[260px] text-[13px] leading-[22px] text-fg-muted md:text-sm md:leading-6">{promo.text}</p>
            <Link
              to="/"
              search={promo.search}
              resetScroll={false}
              onClick={scrollToCatalog}
              aria-label={promo.cta}
              className="mt-1 flex h-10 w-[140px] shrink-0 items-center justify-center gap-1.5 rounded-md bg-brand text-sm font-medium text-ink transition-colors hover:bg-brand-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Explorar
              <MaskIcon src={iconArrow} width={11} height={13} className="-rotate-90" />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}
