import { Link } from '@tanstack/react-router'
import { Clock, XCircle } from 'lucide-react'
import type { ReactNode, Ref } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NETWORK_LABELS, WALLET_KIND_LABELS, type Order } from '@/shared/contracts'
import { formatEth } from '@/shared/lib/format'
import thankYou from '../assets/thank-you.svg'
import { EXPLORER_LABELS, formatReceiptDate, formatReceiptDateLong, shortHash } from '../lib/format-order'
import { OrderDetails } from './order-details'
import { MetaRow, OrderFrame, Rule, type MetaEntry } from './order-frame'

interface ViewProps {
  order: Order
  headingRef: Ref<HTMLHeadingElement>
}

const TITLE_ID = 'order-status-title'
const DETAILS_ID = 'order-details-title'

const headingClass = 'text-base leading-5 font-bold text-fg-muted outline-none md:leading-4'

function Header({
  icon,
  title,
  headingRef,
  children,
}: {
  icon: ReactNode
  title: string
  headingRef: Ref<HTMLHeadingElement>
  children?: ReactNode
}) {
  return (
    <div className="flex min-h-[156px] flex-col items-center justify-center gap-4 px-10 py-[22px] text-center">
      <div className="grid size-20 place-items-center" aria-hidden="true">
        {icon}
      </div>
      <h1 id={TITLE_ID} ref={headingRef} tabIndex={-1} className={headingClass}>
        {title}
      </h1>
      {children}
    </div>
  )
}

const walletEntry = (order: Order): MetaEntry => ({
  label: 'Carteira',
  value: WALLET_KIND_LABELS[order.wallet.kind],
  strong: true,
  title: order.wallet.address,
})

const totalEntry = (order: Order): MetaEntry => ({ label: 'Total', value: formatEth(order.total) })

const orderIdEntry = (order: Order): MetaEntry => ({
  label: 'Pedido',
  value: order.id.replace(/^order-/, '#'),
  strong: true,
  title: order.id,
})

/* --------------------------------- Confirmed --------------------------------- */

/** ORD-03: only rendered for `status === 'confirmed'`. */
export function ConfirmedView({ order, headingRef }: ViewProps) {
  const network = NETWORK_LABELS[order.network]
  const explorer = EXPLORER_LABELS[order.network]
  // cache-sync patches status/txHash from the event; confirmedAt and explorerUrl arrive with
  // the REST refetch it triggers, a few ms later.
  const meta: MetaEntry[] = [
    {
      label: 'ID da transação',
      strong: true,
      title: order.txHash ?? undefined,
      value: order.txHash ? (
        <>
          <span aria-hidden="true" data-testid="order-tx-hash">
            {shortHash(order.txHash)}
          </span>
          <span className="sr-only">{order.txHash}</span>
        </>
      ) : (
        <Skeleton className="inline-block h-4 w-28 align-middle" />
      ),
    },
    {
      label: 'Data',
      title: order.confirmedAt ? formatReceiptDateLong(order.confirmedAt) : undefined,
      value: order.confirmedAt ? (
        <time dateTime={order.confirmedAt} data-testid="order-date">
          {formatReceiptDate(order.confirmedAt)}
        </time>
      ) : (
        <Skeleton className="inline-block h-4 w-24 align-middle" />
      ),
    },
    totalEntry(order),
    walletEntry(order),
  ]

  return (
    <OrderFrame labelledBy={TITLE_ID} testId="order-status" status="confirmed">
      <>
        <Header
          title="Seus NFTs agora estão na sua carteira"
          headingRef={headingRef}
          icon={<img src={thankYou} alt="" width={65} height={80} />}
        >
          <p className="sr-only">Pedido confirmado.</p>
        </Header>
        <Rule />
        <MetaRow entries={meta} />
        <Rule />
        <div className="flex flex-col gap-3 px-4 pt-5 pb-12 md:px-11">
          <OrderDetails order={order} headingId={DETAILS_ID} />
          <Rule soft />
          <p className="px-2 text-center text-sm leading-[22px] text-fg-muted">
            Transação confirmada na {network}. A propriedade foi transferida para sua carteira conectada e registrada na rede.
          </p>
          <div className="flex justify-center pt-2">
            {order.explorerUrl ? (
              <a
                href={order.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[5px] bg-brand p-4 text-base leading-4 font-bold text-ink transition-colors hover:bg-brand-text"
              >
                Ver no {explorer}
                <span className="sr-only"> (simulado, abre em nova aba)</span>
              </a>
            ) : (
              <Skeleton className="h-12 w-[186px] rounded-[5px]" />
            )}
          </div>
        </div>
      </>
    </OrderFrame>
  )
}

/* ---------------------------------- Pending ---------------------------------- */

export function PendingView({ order, headingRef, live }: ViewProps & { live: boolean }) {
  const network = NETWORK_LABELS[order.network]
  const meta: MetaEntry[] = [
    orderIdEntry(order),
    {
      label: 'Data',
      title: formatReceiptDateLong(order.createdAt),
      value: <time dateTime={order.createdAt}>{formatReceiptDate(order.createdAt)}</time>,
    },
    totalEntry(order),
    walletEntry(order),
  ]
  return (
    <OrderFrame labelledBy={TITLE_ID} testId="order-status" status="pending">
      <>
        <Header
          title="Aguardando confirmação da rede"
          headingRef={headingRef}
          icon={
            <span className="relative grid size-20 place-items-center">
              <span className="absolute inset-2 rounded-full border-2 border-brand/25 border-t-brand motion-safe:animate-spin" />
              <Clock className="size-8 text-brand" strokeWidth={1.75} />
            </span>
          }
        >
          <p className="max-w-[420px] text-sm leading-[22px] text-fg-muted">
            Seu pagamento foi enviado para a {network}. Esta página é atualizada automaticamente quando a rede confirmar.
          </p>
        </Header>
        <Rule />
        <MetaRow entries={meta} />
        <Rule />
        <div className="flex flex-col gap-3 px-4 pt-5 pb-12 md:px-11">
          <OrderDetails order={order} headingId={DETAILS_ID} title="Resumo do pedido" />
          <Rule soft />
          <p className="px-2 text-center text-sm leading-[22px] text-fg-subtle" data-testid="order-live-hint">
            {live
              ? 'Conectado em tempo real. Você pode sair desta página: o pedido continua sendo processado.'
              : 'Conexão em tempo real indisponível. Verificando o status a cada poucos segundos.'}
          </p>
        </div>
      </>
    </OrderFrame>
  )
}

/* ---------------------------------- Declined --------------------------------- */

export function DeclinedView({ order, headingRef }: ViewProps) {
  const meta: MetaEntry[] = [
    orderIdEntry(order),
    { label: 'Status', value: 'Recusado' },
    totalEntry(order),
    walletEntry(order),
  ]
  return (
    <OrderFrame labelledBy={TITLE_ID} testId="order-status" status="declined">
      <>
        <Header title="Pagamento recusado" headingRef={headingRef} icon={<XCircle className="size-14 text-danger" strokeWidth={1.5} />}>
          {order.declineReason && (
            <p className="max-w-[440px] text-[15px] leading-[22px] text-fg" data-testid="order-decline-reason">
              {order.declineReason}
            </p>
          )}
          <p className="max-w-[440px] text-sm leading-[22px] text-fg-muted">
            Nenhum valor foi cobrado e os itens continuam no seu carrinho.
          </p>
        </Header>
        <Rule />
        <MetaRow entries={meta} />
        <Rule />
        <div className="flex flex-col gap-3 px-4 pt-5 pb-12 md:px-11">
          <OrderDetails order={order} headingId={DETAILS_ID} title="Itens do pedido" />
          <Rule soft />
          <div className="flex flex-col-reverse justify-center gap-3 pt-2 sm:flex-row">
            <Link to="/cart" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-[5px]')}>
              Voltar ao carrinho
            </Link>
            <Link to="/checkout" preload={false} className={cn(buttonVariants({ size: 'lg' }), 'rounded-[5px]')}>
              Tentar novamente
            </Link>
          </div>
        </div>
      </>
    </OrderFrame>
  )
}

/* ------------------------------- Not found / loading ------------------------------- */

/**
 * 403 (another account's order) and 404 look the same and reveal nothing: fixed text, no
 * server message (AUTH-05).
 */
export function OrderNotFound({ headingRef }: { headingRef: Ref<HTMLHeadingElement> }) {
  return (
    <OrderFrame labelledBy={TITLE_ID} testId="order-not-found">
      <Header title="Pedido não encontrado" headingRef={headingRef} icon={<XCircle className="size-14 text-fg-subtle" strokeWidth={1.5} />}>
        <p className="max-w-[420px] text-sm leading-[22px] text-fg-muted">
          Não encontramos este pedido na sua conta. Confira o endereço ou volte ao início.
        </p>
        <Link to="/" className={cn(buttonVariants({ size: 'lg' }), 'mt-2 rounded-[5px]')}>
          Voltar ao início
        </Link>
      </Header>
    </OrderFrame>
  )
}

export function OrderSkeleton() {
  return (
    <OrderFrame busy testId="order-skeleton">
      <span className="sr-only" role="status">
        Carregando pedido…
      </span>
      <div className="flex h-[156px] flex-col items-center justify-center gap-4">
        <Skeleton className="size-20 rounded-full" />
        <Skeleton className="h-4 w-72 max-w-[80%]" />
      </div>
      <Rule />
      <div className="grid grid-cols-2 gap-4 px-5 py-4 md:flex md:h-[65px] md:items-center md:justify-between md:px-9 md:py-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      <Rule />
      <div className="flex flex-col gap-3 px-4 pt-5 pb-12 md:px-11">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-full" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-[70px] items-center gap-3">
            <Skeleton className="size-14 shrink-0 rounded-lg md:size-[70px]" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3.5 w-28" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
        <Skeleton className="ml-auto h-12 w-full max-w-[321px]" />
      </div>
    </OrderFrame>
  )
}
