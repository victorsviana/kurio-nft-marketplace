import { Link } from '@tanstack/react-router'
import { useId, type FormEvent } from 'react'
import socialFacebook from '@/assets/icons/social-facebook.svg'
import socialInstagram from '@/assets/icons/social-instagram.svg'
import socialLinkedin from '@/assets/icons/social-linkedin.svg'
import socialTwitter from '@/assets/icons/social-twitter.svg'
import socialYoutube from '@/assets/icons/social-youtube.svg'
import { comingSoon } from '@/shared/lib/coming-soon'
import type { Category } from '@/shared/contracts'

const HIGHLIGHTS = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const SOCIALS = [
  { label: 'Facebook', icon: socialFacebook },
  { label: 'Instagram', icon: socialInstagram },
  { label: 'Twitter', icon: socialTwitter },
  { label: 'LinkedIn', icon: socialLinkedin },
  { label: 'YouTube', icon: socialYoutube },
]

const COLLECTION_LINKS: { label: string; category: Category }[] = [
  { label: 'Arte digital', category: 'digital-art' },
  { label: 'Fotografia', category: 'photography' },
  { label: 'Música', category: 'music' },
  { label: 'Arte 3D', category: '3d-art' },
  { label: 'Utilidade', category: 'utility' },
]

const linkClass = 'text-left text-sm leading-[30px] text-fg hover:text-brand-text'
const headingClass = 'text-lg leading-6 font-bold text-fg'

/** Footer component, identical on every desktop screen (design/inicio/spec.md). */
export function Footer() {
  const emailId = useId()
  const noteId = useId()

  const subscribe = (event: FormEvent) => {
    event.preventDefault()
    comingSoon('Newsletter')
  }

  return (
    <footer className="container-page mt-24 pb-6">
      <section aria-label="Destaques da Kurio" className="grid gap-8 bg-surface p-8 lg:min-h-[250px] lg:grid-cols-[1fr_1fr_1fr_357px] lg:gap-0">
        {HIGHLIGHTS.map((item) => (
          <div key={item.letter} className="flex flex-col gap-3 lg:border-r lg:border-brand lg:px-4">
            <span aria-hidden="true" className="grid size-[74px] place-items-center rounded-full bg-brand text-2xl font-bold text-ink">
              {item.letter}
            </span>
            <h2 className="text-[17px] leading-4 font-bold whitespace-nowrap text-fg">{item.title}</h2>
            <p className="max-w-[204px] text-sm leading-[22px] text-fg-muted">{item.text}</p>
          </div>
        ))}
        <form onSubmit={subscribe} className="flex flex-col gap-4 lg:pl-4" aria-describedby={noteId}>
          <label htmlFor={emailId} className="text-lg leading-4 font-bold text-fg">
            Antecipe-se ao próximo lançamento
          </label>
          <div className="flex h-10 overflow-hidden rounded-md bg-surface-dark shadow-[0_0_10px_rgba(10,6,4,0.45)]">
            <input
              id={emailId}
              type="email"
              placeholder="digite seu e-mail..."
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-offset-[-2px]"
            />
            <button type="submit" className="w-[85px] bg-brand text-lg font-bold text-ink hover:bg-brand-text">
              Enviar
            </button>
          </div>
          <p id={noteId} className="text-[13px] leading-[22px] text-fg-muted">
            Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
          </p>
        </form>
      </section>

      <section aria-label="Contato" className="grid gap-4 bg-surface-dark p-8 sm:grid-cols-2 lg:min-h-[88px] lg:grid-cols-4 lg:items-center lg:gap-[92px]">
        <span className="text-sm font-bold tracking-[1.4px] text-fg">KURIO</span>
        <p className="text-sm leading-[22px] text-fg">
          Feito para colecionadores,
          <br /> criadores e cultura
        </p>
        <a href="mailto:contato@email.com" className="text-sm text-fg hover:text-brand-text">
          contato@email.com
        </a>
        <a href="tel:+551140028922" className="text-sm text-fg hover:text-brand-text">
          +55 11 4002 8922
        </a>
      </section>

      <nav aria-label="Rodapé" className="grid gap-8 bg-surface p-8 sm:grid-cols-2 lg:min-h-[236px] lg:grid-cols-[1fr_1fr_1fr_228px] lg:gap-[124px]">
        <div>
          <h2 className={headingClass}>Meu perfil</h2>
          <ul className="mt-2">
            <li>
              <Link to="/account/profile" className={linkClass}>
                Meu perfil
              </Link>
            </li>
            {['Minha coleção', 'Atividade', 'Estúdio do criador', 'Lista de interesse'].map((label) => (
              <li key={label}>
                <button type="button" className={linkClass} onClick={() => comingSoon(label)}>
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className={headingClass}>Central de ajuda</h2>
          <ul className="mt-2">
            {['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'].map((label) => (
              <li key={label}>
                <button type="button" className={linkClass} onClick={() => comingSoon(label)}>
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className={headingClass}>Coleções</h2>
          <ul className="mt-2">
            {COLLECTION_LINKS.map((link) => (
              <li key={link.category}>
                <Link to="/" search={{ category: link.category }} hash="catalogo" className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-8">
          <div>
            <h2 className={headingClass}>Redes sociais</h2>
            <ul className="mt-3 flex gap-2.5">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <button type="button" onClick={() => comingSoon(social.label)} aria-label={`${social.label} (em breve)`} className="block size-[30px]">
                    <img src={social.icon} alt="" width={30} height={30} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className={`${headingClass} whitespace-nowrap`}>Carteiras compatíveis</h2>
            <p className="mt-3 inline-flex h-[26px] items-center rounded-md border border-line-soft bg-surface-dark px-2.5 text-[9px] font-bold whitespace-pre text-brand-text">
              METAMASK  •  WALLETCONNECT  •  COINBASE
            </p>
          </div>
        </div>
      </nav>

      <p className="text-center text-sm leading-[30px] text-fg">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
