import { Link, useLocation } from '@tanstack/react-router'
import { LogOut, UserRound, Wallet, Heart, ChevronDown } from 'lucide-react'
import iconCart from '@/assets/icons/icon-cart.svg'
import iconLogin from '@/assets/icons/icon-login.svg'
import iconSearch from '@/assets/icons/icon-search.svg'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MaskIcon } from '@/components/ui/mask-icon'
import { cn } from '@/lib/utils'
import { cartUnits, useCart } from '@/shared/api/endpoints/cart'
import { useAnnounce } from '@/shared/a11y/announcer'
import { comingSoon } from '@/shared/lib/coming-soon'
import { useAuth, useLogout } from '@/shared/session/auth'
import { useLayoutOptions } from './layout-options'
import { SearchDialog } from './search-dialog'

const navItem = 'relative py-1 text-base leading-6 text-fg transition-colors hover:text-brand-text'
const activeNavItem =
  'font-bold text-brand-text after:absolute after:inset-x-0 after:-bottom-[25px] after:h-[3px] after:bg-brand'

/** Desktop header ("Header Row" component) + compact mobile variant. */
export function Header() {
  const { section, headerDivider, mobileHeader } = useLayoutOptions()
  return (
    <header className={cn('container-page pt-6', !mobileHeader && 'max-md:hidden')}>
      <div className="flex h-[35px] items-center justify-between">
        <Link to="/" className="w-40 text-sm font-bold tracking-[1.4px] text-fg" aria-label="Kurio — início">
          KURIO
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-10 md:flex">
          <Link to="/" className={cn(navItem, section === 'inicio' && activeNavItem)} aria-current={section === 'inicio' ? 'page' : undefined}>
            Início
          </Link>
          <Link
            to="/"
            hash="catalogo"
            className={cn(navItem, section === 'mercado' && activeNavItem)}
            aria-current={section === 'mercado' ? 'page' : undefined}
          >
            Mercado
          </Link>
          <button type="button" className={navItem} onClick={() => comingSoon('Criadores')}>
            Criadores
          </button>
          <button type="button" className={navItem} onClick={() => comingSoon('Aprenda')}>
            Aprenda
          </button>
        </nav>
        <HeaderActions />
      </div>
      <div className={cn('mt-4 h-px bg-brand/30 max-md:hidden', !headerDivider && 'invisible')} aria-hidden="true" />
    </header>
  )
}

function HeaderActions() {
  const { data: cart } = useCart()
  const units = cartUnits(cart)
  return (
    <div className="flex items-center gap-5 md:gap-7">
      <SearchDialog
        trigger={
          <button type="button" className="grid size-8 place-items-center text-fg hover:text-brand-text" aria-label="Buscar NFTs">
            <MaskIcon src={iconSearch} width={20} height={20} />
          </button>
        }
      />
      <Link
        to="/cart"
        className="relative grid size-8 place-items-center text-fg hover:text-brand-text"
        aria-label={units > 0 ? `Carrinho, ${units} ${units === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'}
      >
        <MaskIcon src={iconCart} width={24} height={24} />
        {units > 0 && (
          <span
            aria-hidden="true"
            data-testid="cart-badge"
            className="absolute -top-0.5 left-[19px] grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] leading-none font-medium text-ink ring-2 ring-ink"
          >
            {units > 99 ? '99+' : units}
          </span>
        )}
      </Link>
      <AccountAction />
    </div>
  )
}

function AccountAction() {
  const auth = useAuth()
  const location = useLocation()
  const logout = useLogout()
  const announce = useAnnounce()

  if (auth.status !== 'authenticated') {
    return (
      <Link
        to="/login"
        search={{ redirect: location.href }}
        aria-busy={auth.status === 'loading'}
        className="flex h-[35px] w-[100px] items-center justify-center gap-1 rounded-md bg-brand text-base font-medium text-ink hover:bg-brand-text max-md:w-auto max-md:px-3"
      >
        <img src={iconLogin} alt="" width={18} height={17} />
        Entrar
      </Link>
    )
  }

  const firstName = auth.user.displayName.split(' ')[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-[35px] max-w-[160px] items-center gap-1.5 rounded-md border border-brand px-3 text-base font-medium text-brand-text hover:bg-brand/10"
        aria-label={`Conta de ${auth.user.displayName}`}
      >
        <span className="truncate">{firstName}</span>
        <ChevronDown className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-line-soft bg-surface">
        <DropdownMenuLabel className="truncate text-fg-muted">{auth.user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account/profile">
            <UserRound aria-hidden="true" /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account/wallets">
            <Wallet aria-hidden="true" /> Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/favorites">
            <Heart aria-hidden="true" /> Favoritos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            logout.mutate(undefined, { onSettled: () => announce('Você saiu da sua conta.') })
          }}
        >
          <LogOut aria-hidden="true" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
