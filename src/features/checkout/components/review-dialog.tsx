import { Link } from '@tanstack/react-router'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'
import { NETWORK_LABELS, WALLET_KIND_LABELS, type Quote } from '@/shared/contracts'
import { formatEth, shortAddress } from '@/shared/lib/format'
import { describeIssue } from '../lib/quote-diff'
import type { CheckoutController } from '../lib/use-checkout'

/**
 * CHK-04 review + CHK-05/RT-09 revalidation. Shows the reviewed snapshot; when the live quote
 * moves, the old numbers stay on screen, the changes are listed in plain text and confirming is
 * blocked until the user accepts the new values. Radix hides everything outside the dialog
 * from assistive tech (including the global live regions), so the dialog has its own.
 */
export function ReviewDialog({ checkout }: { checkout: CheckoutController }) {
  const { review, pendingChange, checking, reviewMessage, dialogNotice, phase, busy } = checkout
  const open = Boolean(review)

  const issues = pendingChange ? pendingChange.quote.issues : []
  const issueTexts = issues.length > 0 ? issues.map(describeIssue) : pendingChange ? ['Os valores do pedido mudaram.'] : []
  const blocked = Boolean(pendingChange) || checking
  const newPurchasable = pendingChange ? pendingChange.quote.purchasable : true

  const phaseText =
    phase === 'verifying'
      ? 'O servidor demorou para responder. Verificando seu pedido…'
      : phase === 'submitting'
        ? 'Enviando pedido…'
        : null
  const liveText = pendingChange
    ? `Os valores mudaram desde a sua revisão. ${issueTexts.join('. ')}. Aceite os novos valores para continuar.`
    : (reviewMessage?.text ?? phaseText ?? (checking ? 'Verificando novos valores…' : dialogNotice))

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) checkout.closeReview()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col',
            'overflow-y-auto rounded-xl border border-line bg-surface p-5 text-fg shadow-[0_20px_40px_rgba(10,6,4,0.6)] outline-none sm:p-6',
          )}
        >
          {review && (
            <>
              <div className="sr-only" aria-live="assertive" aria-atomic="true" data-testid="review-live-region">
                {liveText}
              </div>
              <DialogPrimitive.Title className="text-xl leading-6 font-bold">Revise seu pedido</DialogPrimitive.Title>
              <p className="mt-1 text-sm leading-5 text-fg-muted">Confira os valores antes de confirmar o pagamento.</p>

              {pendingChange && (
                <div className="mt-4 flex flex-col gap-2 rounded-lg border border-danger/60 bg-danger/10 p-3" data-testid="stale-quote">
                  <p className="flex items-center gap-2 text-sm leading-5 font-bold">
                    <AlertTriangle aria-hidden="true" className="size-4 shrink-0 text-danger" />
                    Os valores mudaram desde a sua revisão
                  </p>
                  <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-5">
                    {issueTexts.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                  <p className="text-sm leading-5 text-fg-muted">
                    Novo total: <strong className="text-brand-text">{formatEth(pendingChange.quote.total)}</strong>
                    {newPurchasable ? '. Aceite os novos valores para continuar.' : '. Alguns itens não podem ser comprados agora.'}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {newPurchasable ? (
                      <button
                        type="button"
                        onClick={checkout.acceptNewValues}
                        className="h-10 rounded-lg bg-brand px-4 text-sm font-bold text-ink hover:bg-brand-text"
                      >
                        Aceitar novos valores
                      </button>
                    ) : (
                      <Link to="/cart" className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-bold text-ink hover:bg-brand-text">
                        Voltar ao carrinho
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <ReviewBody checkout={checkout} quote={review.quote} />

              {(reviewMessage || phaseText || (checking && !pendingChange)) && (
                <div
                  className={cn(
                    'mt-4 rounded-lg border p-3 text-sm leading-5',
                    reviewMessage && reviewMessage.kind !== 'in-progress' ? 'border-danger/60' : 'border-line-soft',
                  )}
                  data-testid="review-status"
                >
                  {reviewMessage ? (
                    <div className="flex flex-col gap-2">
                      <p>{reviewMessage.text}</p>
                      {reviewMessage.kind === 'disconnected' && (
                        <button
                          type="button"
                          onClick={() => void checkout.reconnectInReview()}
                          disabled={checkout.connection.status === 'connecting'}
                          className="w-fit font-bold text-brand-text underline-offset-4 hover:underline disabled:opacity-60"
                        >
                          {checkout.connection.status === 'connecting' ? 'Conectando carteira…' : 'Reconectar carteira'}
                        </button>
                      )}
                      {reviewMessage.kind === 'transient' && (
                        <button
                          type="button"
                          onClick={() => void checkout.confirmPayment()}
                          className="w-fit font-bold text-brand-text underline-offset-4 hover:underline"
                        >
                          Tentar novamente
                        </button>
                      )}
                      {reviewMessage.kind === 'in-progress' && (
                        <Link
                          to="/orders/$orderId"
                          params={{ orderId: reviewMessage.orderId }}
                          preload={false}
                          className="w-fit font-bold text-brand-text underline-offset-4 hover:underline"
                        >
                          Ver pedido em andamento
                        </Link>
                      )}
                    </div>
                  ) : (
                    <p className="flex items-center gap-2">
                      <Loader2 aria-hidden="true" className="size-4 animate-spin text-brand motion-reduce:animate-none" />
                      {phaseText ?? 'Verificando novos valores…'}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={checkout.closeReview}
                  disabled={busy}
                  className="h-11 rounded-lg border border-brand px-4 text-[15px] font-bold text-brand-text hover:bg-brand/10 disabled:opacity-60"
                >
                  Voltar e editar
                </button>
                <button
                  type="button"
                  onClick={() => void checkout.confirmPayment()}
                  disabled={blocked || busy || reviewMessage?.kind === 'in-progress'}
                  aria-describedby={blocked ? 'review-blocked-reason' : undefined}
                  className="h-11 rounded-lg bg-brand px-5 text-[15px] font-bold text-ink hover:bg-brand-text disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? 'Enviando pedido…' : 'Confirmar pagamento'}
                </button>
              </div>
              {blocked && (
                <p id="review-blocked-reason" className="sr-only">
                  Confirmação bloqueada: os valores mudaram.
                </p>
              )}
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function ReviewBody({ checkout, quote }: { checkout: CheckoutController; quote: Quote }) {
  const review = checkout.review!
  return (
    <div className="mt-4 flex flex-col gap-4">
      <ul aria-label="Itens revisados" className="flex flex-col gap-2">
        {quote.items.map((line) => (
          <li key={line.itemId} className="flex items-start justify-between gap-3 text-sm leading-5">
            <span className="min-w-0">
              <span className="font-bold">{line.name}</span>
              <span className="text-fg-muted">
                {' '}
                · {line.editionLabel} · {formatEth(line.unitPrice)} (x {line.quantity})
              </span>
            </span>
            <span className="shrink-0 font-bold text-brand-text">{formatEth(line.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-line pt-3 text-sm leading-5">
        <dt className="text-fg-muted">Carteira</dt>
        <dd className="text-right">
          {review.wallet.label ? `${review.wallet.label} · ` : ''}
          {WALLET_KIND_LABELS[review.buyer.walletKind]} · {shortAddress(review.wallet.address)}
        </dd>
        <dt className="text-fg-muted">Rede</dt>
        <dd className="text-right">{NETWORK_LABELS[review.network]}</dd>
        <dt className="text-fg-muted">Comprador</dt>
        <dd className="text-right break-all">
          {review.buyer.displayName} · {review.buyer.email}
        </dd>
      </dl>

      <dl className="flex flex-col gap-1.5 border-t border-line pt-3 text-sm leading-5" data-testid="review-totals">
        <ReviewRow label="Subtotal" value={formatEth(quote.subtotal)} />
        <ReviewRow label={quote.coupon?.status === 'applied' ? `Desconto (${quote.coupon.code})` : 'Desconto'} value={`(-) ${formatEth(quote.discount)}`} />
        <ReviewRow label="Taxa de rede" value={formatEth(quote.networkFee)} />
        <div className="mt-1 flex justify-between gap-4 border-t border-line pt-2 text-base font-bold">
          <dt>Total</dt>
          <dd className="text-brand-text">{formatEth(quote.total)}</dd>
        </div>
      </dl>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-fg-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
