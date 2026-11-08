import { Link, useLocation } from '@tanstack/react-router'
import tabCart from '@/assets/icons/tab-cart.svg'
import tabHeart from '@/assets/icons/tab-heart.svg'
import tabHome from '@/assets/icons/tab-home.svg'
import tabScan from '@/assets/icons/tab-scan.svg'
import tabUser from '@/assets/icons/tab-user.svg'
import tabbarBg from '@/assets/icons/tabbar-bg.svg'
import tabbarFab from '@/assets/icons/tabbar-fab.svg'
import { MaskIcon } from '@/components/ui/mask-icon'
import { cn } from '@/lib/utils'
import { cartUnits, useCart } from '@/shared/api/endpoints/cart'
import { comingSoon } from '@/shared/lib/coming-soon'

/**
 * Mobile tab bar ("Tab Bar" in Mobile / Início, 414 × 126). Positions come from the Figma
 * insets (percentages of the frame width), so the layout scales between 360 and 767 px.
 * The center scan button has no flow in the brief and shows an "em breve" notice (GEN-03).
 */
const ITEMS = [
  { to: '/', label: 'Início', icon: tabHome, width: 16, height: 17, left: '8.7%' },
  { to: '/favorites', label: 'Favoritos', icon: tabHeart, width: 20, height: 18, left: '26.09%' },
  { to: '/cart', label: 'Carrinho', icon: tabCart, width: 20, height: 20, left: '70.53%' },
  { to: '/account/profile', label: 'Perfil', icon: tabUser, width: 20, height: 20, left: '85.51%' },
] as const

export function MobileTabBar() {
  const { pathname } = useLocation()
  const { data: cart } = useCart()
  const units = cartUnits(cart)

  return (
    <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-40 h-[126px] overflow-x-clip md:hidden">
      <div className="pointer-events-none absolute inset-x-0 top-[31px] bottom-0" aria-hidden="true">
        <img src={tabbarBg} alt="" className="absolute -top-10 -right-[30px] -bottom-5 -left-[30px] h-[155px] w-[calc(100%+60px)] max-w-none" />
      </div>
      <button
        type="button"
        onClick={() => comingSoon('Leitor de QR code')}
        className="absolute top-0 left-1/2 grid size-[65px] -translate-x-1/2 place-items-center rounded-full"
        aria-label="Ler QR code (em breve)"
      >
        <img src={tabbarFab} alt="" width={65} height={65} className="absolute inset-0" />
        <img src={tabScan} alt="" width={27} height={24} className="relative" />
      </button>
      <ul className="contents">
        {ITEMS.map((item) => {
          const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                preload={item.to === '/favorites' || item.to === '/account/profile' ? false : undefined}
                aria-label={item.to === '/cart' && units > 0 ? `${item.label}, ${units} ${units === 1 ? 'item' : 'itens'}` : item.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'absolute top-[61px] grid size-10 -translate-x-[10px] place-items-center',
                  active ? 'text-brand-text' : 'text-fg-muted',
                )}
                style={{ left: item.left }}
              >
                <MaskIcon src={item.icon} width={item.width} height={item.height} />
                {item.to === '/cart' && units > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 right-0 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] leading-none font-medium text-ink"
                  >
                    {units > 99 ? '99+' : units}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
