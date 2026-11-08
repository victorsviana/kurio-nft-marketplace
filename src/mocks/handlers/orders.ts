import { delay, http, HttpResponse } from 'msw'
import { createOrderInputSchema } from '@/shared/contracts'
import { requireAuth } from '../domain/auth'
import { findCart } from '../domain/cart'
import { fingerprint, newOrderTimes, settleIfDue, toOrderDto } from '../domain/orders'
import { createQuote, findQuote, priceCart, quoteChanged, toQuoteDto } from '../domain/quote'
import { db, mutate } from '../db/store'
import type { OrderRecord } from '../db/types'
import { api, apiError, readBody } from '../lib/http'
import { getScenario } from '../scenarios/engine'

/**
 * Orders (CHK-05, CHK-06, ORD-01..ORD-06).
 *
 * POST /orders requires an `Idempotency-Key`. The same key with the same body returns the same
 * order (200); the same key with another body is a 409 IDEMPOTENCY_CONFLICT. Before creating, the
 * server re-prices the cart and compares it with the quote the user reviewed: any difference in
 * price, stock, coupon or fee is a 409 QUOTE_STALE carrying the new quote, so a stale quote can
 * never be confirmed. In the `order-timeout` scenario the order is created and persisted first and
 * only then the response is delayed past the client timeout (once per key), which is how the
 * client's retry with the same key recovers the very same order.
 */

/** Longer than the client's order timeout (ORDER_TIMEOUT_MS = 4s). */
const TIMEOUT_DELAY_MS = 6_000
const delayedKeys = new Set<string>()

export const orderHandlers = [
  http.post(api('/orders'), async ({ request }) => {
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const userId = auth.user.id
    const key = request.headers.get('Idempotency-Key')?.trim()
    if (!key) return apiError(400, 'BAD_REQUEST', 'Cabeçalho Idempotency-Key ausente.')

    const body = await readBody(request, createOrderInputSchema)
    if (!body.ok) return body.response
    const print = fingerprint(body.data)

    // Replay of an attempt: same key → same order, or a conflict if the body changed.
    const previous = db().idempotency.find((r) => r.userId === userId && r.key === key)
    if (previous) {
      if (previous.fingerprint !== print) {
        return apiError(409, 'IDEMPOTENCY_CONFLICT', 'Esta chave de idempotência já foi usada com outro pedido.')
      }
      const order = db().orders.find((o) => o.id === previous.orderId)!
      return HttpResponse.json(toOrderDto(settleIfDue(order)), { status: 200 })
    }

    const pending = db().orders.find((o) => o.userId === userId && o.status === 'pending')
    if (pending) {
      return apiError(409, 'ORDER_IN_PROGRESS', 'Você já tem um pedido aguardando confirmação.', {
        details: { orderId: pending.id },
      })
    }

    const { quoteId, walletId, network, buyer } = body.data
    const quote = findQuote(quoteId)
    const cart = findCart(db(), { kind: 'user', userId })
    if (!quote || !cart || quote.cartId !== cart.id) return apiError(404, 'NOT_FOUND', 'Cotação não encontrada.')

    const wallets = db().wallets[userId]
    const wallet = [wallets?.primary, wallets?.secondary].find((w) => w?.id === walletId)
    if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
    if (wallet.address.toLowerCase() !== buyer.walletAddress.toLowerCase()) {
      return apiError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', {
        fieldErrors: { 'buyer.walletAddress': 'Use o endereço da carteira cadastrada selecionada.' },
      })
    }
    const connected = db().walletConnections.some(
      (c) => c.userId === userId && c.walletId === walletId && c.network === network,
    )
    if (!connected) {
      return apiError(422, 'WALLET_DISCONNECTED', 'A carteira foi desconectada. Conecte-a novamente para confirmar.')
    }

    // Revalidation (CHK-05): never confirm with a quote that no longer matches the cart.
    const current = priceCart(cart, network, userId)
    if (quote.network !== network || quoteChanged(quote, current)) {
      const fresh = createQuote(cart, network, userId, quote)
      return apiError(409, 'QUOTE_STALE', 'Os valores mudaram desde a sua revisão. Confira e confirme novamente.', {
        details: { quote: toQuoteDto(fresh) },
      })
    }

    const scenario = getScenario()
    const order = mutate((draft) => {
      const record: OrderRecord = {
        id: `order-${crypto.randomUUID().slice(0, 8)}`,
        status: 'pending',
        txHash: null,
        explorerUrl: null,
        ...newOrderTimes(),
        confirmedAt: null,
        declineReason: null,
        wallet: { id: wallet.id, address: wallet.address, kind: wallet.kind, label: wallet.label },
        network,
        buyer: { displayName: buyer.displayName, email: buyer.email, username: buyer.username },
        items: quote.items,
        subtotal: quote.subtotal,
        discount: quote.discount,
        networkFee: quote.networkFee,
        total: quote.total,
        couponCode: quote.coupon?.status === 'applied' ? quote.coupon.code : null,
        version: 1,
        userId,
        quoteId,
        plannedOutcome: scenario.paymentOutcome,
      }
      draft.orders.push(record)
      draft.idempotency.push({ key, userId, fingerprint: print, orderId: record.id, createdAt: record.createdAt })
      return record
    })
    settleIfDue(order) // arms the settlement timer

    if (scenario.orderTimeout && !delayedKeys.has(key)) {
      delayedKeys.add(key)
      await delay(TIMEOUT_DELAY_MS)
    }
    return HttpResponse.json(toOrderDto(db().orders.find((o) => o.id === order.id)!), { status: 201 })
  }),

  http.get(api('/orders/active'), ({ request }) => {
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const pending = db()
      .orders.filter((o) => o.userId === auth.user.id && o.status === 'pending')
      .map(settleIfDue)
      .find((o) => o.status === 'pending')
    return HttpResponse.json({ order: pending ? toOrderDto(pending) : null })
  }),

  http.get(api('/orders/:orderId'), ({ request, params }) => {
    const auth = requireAuth(request)
    if (!auth.ok) return auth.response
    const order = db().orders.find((o) => o.id === params.orderId)
    if (!order) return apiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
    // Never reveal another user's order (AUTH-05).
    if (order.userId !== auth.user.id) return apiError(403, 'FORBIDDEN', 'Este pedido pertence a outra conta.')
    return HttpResponse.json(toOrderDto(settleIfDue(order)))
  }),
]
