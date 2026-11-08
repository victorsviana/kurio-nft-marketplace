import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useId, type FormEvent, type ReactNode } from 'react'
import { EmptyState, ErrorState } from '@/components/feedback/states'
import { MaskIcon } from '@/components/ui/mask-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { profileQuery, walletsQuery } from '@/shared/api/endpoints/account'
import { useCart } from '@/shared/api/endpoints/cart'
import { formatEth } from '@/shared/lib/format'
import { useAuth } from '@/shared/session/auth'
import iconArrow from './assets/icon-arrow-left.svg'
import iconArrowDown from './assets/icon-arrow-down.svg'
import { CollectorForm } from './components/collector-form'
import { CheckoutNotices, CheckoutSkeleton } from './components/notices'
import { OrderSummary } from './components/order-summary'
import { ReviewDialog } from './components/review-dialog'
import { ConnectionStatus, ConnectorOptions, WalletCards } from './components/wallet-choice'
import { useIsDesktop } from './lib/use-is-desktop'
import { useCheckout, type CheckoutController, type CheckoutData } from './lib/use-checkout'

const FORM_ID = 'checkout-form'

/** Payment screen (Figma Desktop / Pagamento and Mobile / Pagamento; CHK-01..CHK-07, WAL-03, RT-09). */
export function CheckoutScreen() {
  const auth = useAuth()
  const desktop = useIsDesktop()
  // The route guard already required a session; this only waits for the user query.
  if (auth.status !== 'authenticated') return <CheckoutSkeleton desktop={desktop} />
  return <CheckoutLoader key={auth.user.id} userId={auth.user.id} desktop={desktop} />
}

function CheckoutLoader({ userId, desktop }: { userId: string; desktop: boolean }) {
  const cart = useCart()
  const profile = useQuery(profileQuery(userId))
  const wallets = useQuery(walletsQuery(userId))
  const queries = [cart, profile, wallets]

  if (queries.some((q) => q.isPending)) return <CheckoutSkeleton desktop={desktop} />
  const failed = queries.find((q) => q.isError)
  if (failed || !cart.data || !profile.data || !wallets.data) {
    return (
      <Frame desktop={desktop}>
        <ErrorState
          error={failed?.error}
          title="Não foi possível carregar o pagamento"
          onRetry={() => queries.forEach((q) => q.isError && void q.refetch())}
        />
      </Frame>
    )
  }
  if (cart.data.items.length === 0) {
    return (
      <Frame desktop={desktop}>
        <EmptyState
          title="Seu carrinho está vazio"
          description="Adicione NFTs ao carrinho para seguir para o pagamento."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/" className="inline-flex h-10 items-center rounded-lg bg-brand px-4 font-bold text-ink hover:bg-brand-text">
                Explorar o mercado
              </Link>
              <Link to="/cart" className="inline-flex h-10 items-center rounded-lg border border-brand px-4 font-bold text-brand-text hover:bg-brand/10">
                Ver carrinho
              </Link>
            </div>
          }
        />
      </Frame>
    )
  }
  if (!wallets.data.primary && !wallets.data.secondary) {
    return (
      <Frame desktop={desktop}>
        <EmptyState
          title="Cadastre uma carteira para pagar"
          description="O pagamento usa as carteiras cadastradas na sua conta. Cadastre uma carteira e volte para concluir a compra."
          action={
            <Link
              to="/account/wallets"
              preload={false}
              className="inline-flex h-10 items-center rounded-lg bg-brand px-4 font-bold text-ink hover:bg-brand-text"
            >
              Cadastrar carteira
            </Link>
          }
        />
      </Frame>
    )
  }
  return <CheckoutContent data={{ userId, profile: profile.data, wallets: wallets.data }} desktop={desktop} />
}

function CheckoutContent({ data, desktop }: { data: CheckoutData; desktop: boolean }) {
  const checkout = useCheckout(data)
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void checkout.startCheckout()
  }
  return (
    <>
      {desktop ? <DesktopCheckout checkout={checkout} onSubmit={onSubmit} /> : <MobileCheckout checkout={checkout} onSubmit={onSubmit} />}
      <ReviewDialog checkout={checkout} />
    </>
  )
}

/* ------------------------------------ shared ------------------------------------ */

function Frame({ desktop, children }: { desktop: boolean; children: ReactNode }) {
  return desktop ? (
    <div className="container-page pt-8 pb-16">
      <Breadcrumb />
      <h1 className="sr-only">Pagamento</h1>
      <div className="mt-8">{children}</div>
    </div>
  ) : (
    <div className="flex flex-col gap-6 px-7 py-8 max-[359px]:px-4">
      <MobileTopBar />
      {children}
    </div>
  )
}

function Breadcrumb() {
  return (
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
        <li aria-current="page">Pagamento</li>
      </ol>
    </nav>
  )
}

function ctaLabel(checkout: CheckoutController) {
  if (checkout.connection.status === 'connecting') return 'Conectando carteira…'
  if (checkout.preparing) return 'Atualizando cotação…'
  return 'Confirmar compra'
}

const ctaDisabled = (checkout: CheckoutController) =>
  checkout.preparing || checkout.busy || Boolean(checkout.pendingOrder) || Boolean(checkout.review)

/* ------------------------------------ desktop ----------------------------------- */

function DesktopCheckout({ checkout, onSubmit }: { checkout: CheckoutController; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const titleId = useId()
  const locked = Boolean(checkout.review) || checkout.preparing
  return (
    <div className="container-page pt-8 pb-16">
      <Breadcrumb />
      <h1 className="sr-only">Pagamento</h1>
      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
        <form id={FORM_ID} noValidate onSubmit={onSubmit} aria-labelledby={titleId} className="flex min-w-0 flex-1 flex-col gap-3">
          <h2 id={titleId} className="text-[17px] leading-4 font-bold text-fg">
            Perfil do colecionador
          </h2>
          <CollectorForm checkout={checkout} columns={2} disabled={locked} />
        </form>

        <div className="flex w-full min-w-0 flex-col gap-6 lg:w-[405px] lg:shrink-0">
          <OrderSummary checkout={checkout} disabled={locked} />
          <ConnectorOptions checkout={checkout} variant="desktop" disabled={locked} />
          <ConnectionStatus checkout={checkout} />
          <CheckoutNotices checkout={checkout} />
          <button
            type="submit"
            form={FORM_ID}
            disabled={ctaDisabled(checkout)}
            className="h-[45px] w-full rounded-lg bg-brand text-[15px] leading-4 font-bold text-ink transition-colors hover:bg-brand-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ctaLabel(checkout)}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------ mobile ------------------------------------ */

function MobileTopBar() {
  return (
    <div className="flex h-11 items-center gap-6">
      <Link
        to="/cart"
        aria-label="Voltar ao carrinho"
        className="grid size-[35px] shrink-0 place-content-center rounded-full border border-line bg-surface-raised text-fg-subtle transition-colors hover:border-line-soft"
      >
        <MaskIcon src={iconArrow} width={13} height={7} className="rotate-90" />
      </Link>
      <h1 className="text-xl leading-4 font-bold text-fg">Pagamento com carteira</h1>
    </div>
  )
}

function MobileCheckout({ checkout, onSubmit }: { checkout: CheckoutController; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const panelId = useId()
  const locked = Boolean(checkout.review) || checkout.preparing
  const hasErrors = Object.values(checkout.errors).some(Boolean)
  const quote = checkout.quote
  return (
    <div className="flex min-h-dvh flex-col justify-between gap-6 px-7 pt-8 max-[359px]:px-4">
      <div className="flex flex-col gap-4">
        <MobileTopBar />

        <section className="rounded-[14px] bg-surface">
          <h2>
            <button
              type="button"
              aria-expanded={checkout.collectorOpen}
              aria-controls={panelId}
              onClick={() => checkout.setCollectorOpen(!checkout.collectorOpen)}
              className="flex w-full items-center justify-between gap-3 rounded-[14px] px-[19px] py-4 text-left text-base leading-4 font-bold text-fg"
            >
              <span>
                Dados do colecionador
                {hasErrors && <span className="ml-2 text-[13px] font-normal text-danger">(revise os campos)</span>}
              </span>
              <MaskIcon
                src={iconArrowDown}
                width={18}
                height={18}
                className={cn('text-fg-subtle transition-transform', checkout.collectorOpen && 'rotate-180')}
              />
            </button>
          </h2>
          <form id={FORM_ID} noValidate onSubmit={onSubmit} hidden={!checkout.collectorOpen} className="px-[19px] pb-5">
            <div id={panelId}>
              <CollectorForm checkout={checkout} columns={1} disabled={locked} />
            </div>
          </form>
        </section>

        <WalletCards checkout={checkout} disabled={locked} />
        <ConnectorOptions checkout={checkout} variant="mobile" disabled={locked} />
        <ConnectionStatus checkout={checkout} />
        <CheckoutNotices checkout={checkout} />

        <div className="mt-3 flex items-center justify-end gap-7 text-base leading-4 font-bold text-fg">
          <span>Total:</span>
          {quote.data ? (
            <span className="text-lg text-brand-text" data-testid="checkout-total">
              {formatEth(quote.data.total)}
            </span>
          ) : quote.isError ? (
            <button type="button" onClick={() => void quote.refetch()} className="text-sm text-danger underline">
              Erro ao calcular. Tentar novamente
            </button>
          ) : (
            <Skeleton className="h-[18px] w-24" />
          )}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-7 bg-gradient-to-t from-ink via-ink to-transparent px-7 pt-4 pb-8 max-[359px]:-mx-4 max-[359px]:px-4">
        <button
          type="submit"
          form={FORM_ID}
          disabled={ctaDisabled(checkout)}
          className="h-[60px] w-full rounded-[40px] bg-[linear-gradient(108deg,#D28A4C_4%,rgba(210,138,76,0.8)_122%)] text-[15px] leading-4 font-bold text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {ctaLabel(checkout)}
        </button>
      </div>
    </div>
  )
}
