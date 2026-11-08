import type { UseQueryResult } from '@tanstack/react-query'
import { Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { Loader2, ShoppingCart } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { ErrorState } from '@/components/feedback/states'
import { Button } from '@/components/ui/button'
import { MaskIcon } from '@/components/ui/mask-icon'
import { RelatedSection } from '@/features/nft-detail/components/related-section'
import { useIsDesktop } from '@/features/nft-detail/lib/use-media-query'
import { cn } from '@/lib/utils'
import { useCart, useCartQuote } from '@/shared/api/endpoints/cart'
import type { Cart, Quote } from '@/shared/contracts'
import iconArrowLeft from './assets/icon-arrow-left.svg'
import { CartLinesSkeleton, CartSummarySkeleton } from './components/cart-skeleton'
import { CartSummary } from './components/cart-summary'
import { CartTable } from './components/cart-table'
import { MobileCartItem } from './components/mobile-cart-item'
import { useCartRealtimeNotices, type CartRealtimeNotices } from './use-cart-realtime'

interface ScreenProps {
  cart: UseQueryResult<Cart>
  quote: UseQueryResult<Quote>
  notices: CartRealtimeNotices
}

/**
 * `/cart` (CART-01..CART-08). Public: visitors use the guest cart (X-Guest-Cart-Id). One
 * composition is rendered (desktop ≥ 768 / mobile), never both, so names and ids stay unique.
 * Data states (GEN-05, GEN-06): skeleton, error with retry, empty cart, background refresh.
 */
export function CartScreen() {
  const desktop = useIsDesktop()
  const cart = useCart()
  const quote = useCartQuote('ethereum')
  const notices = useCartRealtimeNotices(cart.data?.items ?? [], cart.dataUpdatedAt)

  useEffect(() => {
    const previous = document.title
    document.title = 'Carrinho | Kurio'
    return () => {
      document.title = previous
    }
  }, [])

  const props = { cart, quote, notices }
  return desktop ? <DesktopCart {...props} /> : <MobileCart {...props} />
}

/* ------------------------------------ Desktop (≥ 768) ------------------------------------ */

function DesktopCart({ cart, quote, notices }: ScreenProps) {
  const data = cart.data
  const firstNftId = data?.items[0]?.nftId

  return (
    <div className="container-page pt-6 pb-8">
      <h1 className="sr-only">Carrinho de NFTs</h1>
      <div className="flex items-center justify-between gap-4">
        <nav aria-label="Trilha de navegação">
          <ol className="flex items-center gap-2 text-[15px] leading-4 font-bold text-fg">
            <li>
              <Link to="/" className="hover:text-brand-text">
                Início
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/" hash="catalogo" className="hover:text-brand-text">
                Mercado
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Carrinho</li>
          </ol>
        </nav>
        <BackgroundIndicator cart={cart} />
      </div>

      <CartBody
        cart={cart}
        renderLoading={() => (
          <div className="mt-0 flex flex-col gap-12 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 xl:w-[782px]">
              <CartLinesSkeleton desktop />
            </div>
            <div className="w-full md:max-w-[420px] md:self-end xl:w-[332px] xl:self-start">
              <CartSummarySkeleton desktop />
            </div>
          </div>
        )}
        renderEmpty={() => <EmptyCart className="mt-6" />}
      >
        {(loaded) => (
          <div className="mt-0 flex flex-col gap-12 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 xl:w-[782px]">
              <CartTable items={loaded.items} quote={quote.data} notices={notices} />
            </div>
            <CartSummary
              cart={loaded}
              quote={quote}
              variant="desktop"
              className="w-full md:max-w-[420px] md:self-end xl:w-[332px] xl:self-start xl:pt-3"
            />
          </div>
        )}
      </CartBody>

      {firstNftId && <RelatedSection nftId={firstNftId} title="Colecionadores também viram" className="mt-24" />}
    </div>
  )
}

/* ------------------------------------- Mobile (< 768) ------------------------------------- */

function MobileCart({ cart, quote, notices }: ScreenProps) {
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()

  function goBack() {
    if (canGoBack) router.history.back()
    else void navigate({ to: '/' })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="px-4 pt-8 min-[414px]:px-7">
        <div className="relative flex h-11 items-center justify-center">
          <button
            type="button"
            onClick={goBack}
            aria-label="Voltar"
            className="absolute left-0 grid size-[35px] place-items-center rounded-full border border-line bg-surface-raised transition-colors hover:border-line-soft"
          >
            <MaskIcon src={iconArrowLeft} width={13.17} height={7.33} className="rotate-90 text-fg-subtle" />
          </button>
          <h1 className="text-xl leading-4 font-bold text-fg">Carrinho de NFTs</h1>
          <div className="absolute right-0">
            <BackgroundIndicator cart={cart} compact />
          </div>
        </div>
      </div>

      <CartBody
        cart={cart}
        renderLoading={() => (
          <>
            <div className="mt-3 px-4 min-[414px]:px-7">
              <CartLinesSkeleton desktop={false} />
            </div>
            <div className="mt-8 flex flex-1 flex-col justify-end">
              <div className="rounded-t-[40px] bg-surface px-6 pt-6 pb-9">
                <CartSummarySkeleton desktop={false} />
              </div>
            </div>
          </>
        )}
        renderEmpty={() => <EmptyCart className="mx-4 mt-6 min-[414px]:mx-7" />}
      >
        {(loaded) => (
          <>
            <ul aria-label="Itens do carrinho" className="mt-3 flex flex-col gap-5 px-4 min-[414px]:px-7">
              {loaded.items.map((item) => (
                <MobileCartItem key={item.id} item={item} quote={quote.data} notices={notices} />
              ))}
            </ul>
            <div className="mt-8 flex flex-1 flex-col justify-end">
              <CartSummary cart={loaded} quote={quote} variant="mobile" className="rounded-t-[40px] bg-surface px-6 pt-6 pb-9" />
            </div>
          </>
        )}
      </CartBody>
    </div>
  )
}

/* ------------------------------------------ Shared ------------------------------------------ */

function CartBody({
  cart,
  renderLoading,
  renderEmpty,
  children,
}: {
  cart: UseQueryResult<Cart>
  renderLoading: () => ReactNode
  renderEmpty: () => ReactNode
  children: (cart: Cart) => ReactNode
}) {
  if (cart.data) return cart.data.items.length === 0 ? renderEmpty() : children(cart.data)
  if (cart.isError) {
    return (
      <ErrorState
        error={cart.error}
        title="Não foi possível carregar o carrinho"
        onRetry={() => void cart.refetch()}
        className="mx-4 mt-6 md:mx-0"
      />
    )
  }
  return (
    <div role="status" aria-busy="true" data-testid="cart-skeleton" className="flex flex-1 flex-col">
      <span className="sr-only">Carregando carrinho…</span>
      {renderLoading()}
    </div>
  )
}

function EmptyCart({ className }: { className?: string }) {
  return (
    <div
      role="status"
      data-testid="cart-empty"
      className={cn('flex flex-col items-center gap-3 rounded-lg bg-surface px-6 py-12 text-center', className)}
    >
      <ShoppingCart aria-hidden="true" className="size-8 text-fg-subtle" />
      <h2 className="text-lg font-bold text-fg">Seu carrinho está vazio</h2>
      <p className="max-w-md text-sm text-fg-muted">Explore o mercado e adicione NFTs para vê-los aqui.</p>
      <Button asChild className="mt-1">
        <Link to="/" hash="catalogo">
          Explorar o mercado
        </Link>
      </Button>
    </div>
  )
}

function BackgroundIndicator({ cart, compact = false }: { cart: UseQueryResult<Cart>; compact?: boolean }) {
  if (cart.data && cart.isRefetchError) {
    return (
      <p className="flex items-center gap-2 text-xs text-fg-muted">
        {!compact && 'Não foi possível atualizar o carrinho.'}
        <button type="button" onClick={() => void cart.refetch()} className="text-brand-text underline underline-offset-2">
          Tentar novamente
        </button>
      </p>
    )
  }
  // Only visible when a background refetch takes longer than ~0.5 s (no flicker on fast ones).
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex items-center gap-1.5 text-xs text-fg-subtle transition-opacity',
        cart.data && cart.isRefetching ? 'opacity-100 delay-500' : 'opacity-0 delay-0',
      )}
    >
      <Loader2 className="size-3.5 animate-spin" />
      {!compact && 'Atualizando…'}
    </span>
  )
}
