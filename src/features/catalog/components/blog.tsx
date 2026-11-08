import { NftImage } from '@/components/nft/nft-image'
import { comingSoon } from '@/shared/lib/coming-soon'

/*
 * "Diário da Cunhagem" is editorial content outside the functional scope (GEN-03): static
 * cards whose "Ler mais" shows an "em breve" notice. The blog images were not exported from
 * the Figma, so the cards reuse the NFT artworks in the same order as the frame.
 */
const POSTS = [
  {
    date: '12 de setembro',
    readTime: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    summary: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: '/images/nft/neon-vessel-512.webp',
  },
  {
    date: '13 de setembro',
    readTime: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    summary: 'Conheça criadores que moldam a cultura digital.',
    image: '/images/nft/emerald-ape-512.webp',
  },
  {
    date: '15 de setembro',
    readTime: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    summary: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: '/images/nft/sage-nomad-512.webp',
  },
  {
    date: '15 de setembro',
    readTime: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    summary: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: '/images/nft/golden-beat-512.webp',
  },
]

export function Blog() {
  return (
    <section aria-labelledby="blog-title" className="flex flex-col gap-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <h2 id="blog-title" className="text-2xl font-bold text-fg-strong md:text-[28px]">
          Diário da Cunhagem
        </h2>
        <p className="text-sm text-fg-muted">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </header>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[repeat(4,268px)]">
        {POSTS.map((post) => (
          <li key={post.title}>
            <article className="flex h-full flex-col overflow-hidden rounded-lg bg-surface">
              <NftImage
                src={post.image}
                alt=""
                width={268}
                height={195}
                sizes="(min-width: 1280px) 268px, (min-width: 640px) 45vw, 100vw"
                className="h-[195px] w-full"
              />
              <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
                <p className="text-xs leading-4 font-medium whitespace-pre-wrap text-fg-muted">
                  {post.date}
                  {'  |  '}
                  {post.readTime}
                </p>
                <h3 className="text-base leading-[21px] font-bold text-fg">{post.title}</h3>
                <p className="text-xs leading-4 font-medium text-fg-muted">{post.summary}</p>
                <button
                  type="button"
                  onClick={() => comingSoon('Diário da Cunhagem')}
                  className="mt-auto self-start rounded-sm text-xs leading-4 font-bold text-brand-text hover:underline"
                >
                  Ler mais <span aria-hidden="true">→</span>
                  <span className="sr-only">: {post.title} (em breve)</span>
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
