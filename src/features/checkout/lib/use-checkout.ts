import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useAnnounce } from '@/shared/a11y/announcer'
import { activeOrderQuery, connectWallet, disconnectWallet } from '@/shared/api/endpoints/account'
import { fetchQuote, quoteQuery, useCartOwnerKey, useCartQuote } from '@/shared/api/endpoints/cart'
import { toApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/query-keys'
import type { Buyer, Network, Profile, Quote, Wallet, WalletKind, WalletSlot, WalletsResponse } from '@/shared/contracts'
import { useRealtimeEvent } from '@/shared/realtime/realtime-provider'
import {
  clearDraft,
  firstInvalid,
  isWalletKind,
  loadDraft,
  parseCheckoutForm,
  pickFormErrors,
  prefill,
  saveDraft,
  validateField,
  walletOf,
  withWallet,
  type BuyerField,
  type CheckoutFormState,
  type FieldErrors,
  type FormField,
} from './buyer-form'
import { useOrderAttempt } from './order-attempt'
import { quoteSignature } from './quote-diff'

/**
 * State machine of the payment screen (CHK-02..CHK-07, RT-09):
 * form → validation → wallet connection → review (snapshot of a freshly fetched quote) →
 * idempotent submission → order page.
 *
 * While the review is open, the live quote (`useCartQuote(network)`, re-priced by any cart
 * invalidation, including realtime `nft.updated`) is compared by value with the reviewed one.
 * Any difference blocks the confirmation in the same render, then the server is asked what
 * changed (`previousQuoteId`), and the user must accept the new values explicitly. The server's
 * 409 QUOTE_STALE is the backstop when the client did not notice (socket down).
 */

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'rejected' | 'disconnected' | 'error'
export interface ConnectionState {
  status: ConnectionStatus
  message?: string
}

export interface Review {
  quote: Quote
  buyer: Buyer
  network: Network
  wallet: Wallet
}

export interface StaleCheck {
  /** Live signature this check answered (`server` for the 409 backstop). */
  liveSig: string
  quote: Quote
}

export type ReviewMessage =
  | { kind: 'transient'; text: string }
  | { kind: 'disconnected'; text: string }
  | { kind: 'in-progress'; text: string; orderId: string }
  | { kind: 'error'; text: string }

export interface CheckoutData {
  userId: string
  profile: Profile
  wallets: WalletsResponse
}

const connectionKey = (walletId: string | undefined, network: string, kind: string) => `${walletId}|${network}|${kind}`

export function useCheckout({ userId, profile, wallets }: CheckoutData) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const ownerKey = useCartOwnerKey()
  const baseId = useId()
  const attempt = useOrderAttempt(userId)

  /* ------------------------------ form ------------------------------ */

  const [form, setForm] = useState<CheckoutFormState>(() => loadDraft(userId, wallets) ?? prefill(profile, wallets))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formAlert, setFormAlert] = useState<string | null>(null)
  /** Mobile: the collector form lives in a collapsible section. */
  const [collectorOpen, setCollectorOpen] = useState(false)

  useEffect(() => saveDraft(userId, form), [userId, form])

  const fieldId = (field: FormField) => `${baseId}-${field}`
  const errorId = (field: FormField) => `${baseId}-${field}-error`

  const revalidate = (field: FormField, next: CheckoutFormState) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: validateField(field, next) } : prev))

  const setValue = (field: BuyerField, value: string) => {
    const next = { ...form, values: { ...form.values, [field]: value } }
    setForm(next)
    setFormAlert(null)
    revalidate(field, next)
  }

  const setNetwork = (network: Network) => {
    const next = { ...form, network }
    setForm(next)
    revalidate('network', next)
  }

  const setWalletKind = (kind: WalletKind) => setValue('walletKind', kind)

  const setSlot = (slot: WalletSlot) => {
    const next = withWallet(form, wallets, slot)
    setForm(next)
    setErrors((prev) => ({ ...prev, walletAddress: undefined, walletKind: undefined, network: undefined }))
  }

  const showFieldErrors = (next: FieldErrors) => {
    flushSync(() => {
      setErrors(next)
      setCollectorOpen(true)
    })
    const first = firstInvalid(next)
    if (first) document.getElementById(fieldId(first))?.focus()
    const count = Object.values(next).filter(Boolean).length
    announce(count === 1 ? 'Revise o campo destacado.' : `Revise os ${count} campos destacados.`, 'assertive')
  }

  /* ----------------------------- quote ------------------------------ */

  const network: Network = form.network || 'ethereum'
  const quoteQueryResult = useCartQuote(network)
  const liveQuote = quoteQueryResult.data
  const wallet = walletOf(wallets, form.slot)

  const activeOrder = useQuery(activeOrderQuery(userId))
  const pendingOrder = activeOrder.data?.status === 'pending' ? activeOrder.data : null

  /* --------------------------- connection --------------------------- */

  const currentKey = connectionKey(wallet?.id, network, form.values.walletKind)
  const [connection, setConnection] = useState<ConnectionState & { key: string }>({ status: 'idle', key: '' })
  // Another wallet, network or connector is another connection (the server keys it by wallet + network).
  const connectionState: ConnectionState = connection.key === currentKey ? connection : { status: 'idle' }

  const connect = useCallback(async (): Promise<boolean> => {
    if (!wallet || !isWalletKind(form.values.walletKind)) return false
    const key = connectionKey(wallet.id, network, form.values.walletKind)
    setConnection({ status: 'connecting', key })
    announce('Conectando carteira…')
    try {
      await connectWallet(wallet.id, network, form.values.walletKind)
      setConnection({ status: 'connected', key })
      announce('Carteira conectada.')
      return true
    } catch (error) {
      const apiError = toApiError(error)
      const rejected = apiError.code === 'WALLET_REJECTED'
      const message = rejected
        ? 'A carteira recusou a conexão. Tente novamente ou escolha outra carteira.'
        : apiError.message || 'Não foi possível conectar a carteira. Tente novamente.'
      setConnection({ status: rejected ? 'rejected' : 'error', key, message })
      announce(message, 'assertive')
      return false
    }
  }, [announce, form.values.walletKind, network, wallet])

  const disconnect = async () => {
    if (!wallet) return
    try {
      await disconnectWallet(wallet.id)
      setConnection({ status: 'disconnected', key: currentKey })
      announce('Carteira desconectada.')
    } catch (error) {
      const message = toApiError(error).message || 'Não foi possível desconectar a carteira.'
      announce(message, 'assertive')
    }
  }

  /* ----------------------------- review ----------------------------- */

  const [review, setReview] = useState<Review | null>(null)
  const [check, setCheck] = useState<StaleCheck | null>(null)
  const [reviewMessage, setReviewMessage] = useState<ReviewMessage | null>(null)
  /** Polite messages for the dialog's own live region (the global ones are aria-hidden behind it). */
  const [dialogNotice, setDialogNotice] = useState('')
  const [preparing, setPreparing] = useState(false)
  const preparingRef = useRef(false)

  const reviewedSig = review ? quoteSignature(review.quote) : null
  const liveSig = liveQuote ? quoteSignature(liveQuote) : null
  const liveDiffers = Boolean(review && liveSig && !quoteQueryResult.isFetching && liveSig !== reviewedSig)
  /** New values the user has not accepted yet. */
  const pendingChange = review && check && quoteSignature(check.quote) !== reviewedSig ? check : null
  /** The live quote moved and the server has not said what changed yet: already blocked. */
  const checking = liveDiffers && check?.liveSig !== liveSig

  useEffect(() => {
    if (!checking || !review || !liveSig) return
    let cancelled = false
    fetchQuote({ network: review.network, previousQuoteId: review.quote.id })
      .then((quote) => {
        if (cancelled) return
        setCheck({ liveSig, quote })
        if (quoteSignature(quote) !== quoteSignature(review.quote)) {
          announce('Os valores mudaram desde a sua revisão. Confira as alterações e aceite os novos valores para continuar.', 'assertive')
        }
      })
      .catch(() => {
        // Could not ask the server: keep the confirmation blocked with the live quote as the new value.
        if (!cancelled && liveQuote) setCheck({ liveSig, quote: liveQuote })
      })
    return () => {
      cancelled = true
    }
    // One request per distinct live signature.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, liveSig])

  const closeReview = () => {
    setReview(null)
    setCheck(null)
    setReviewMessage(null)
    setDialogNotice('')
  }

  const acceptNewValues = () => {
    if (!pendingChange || !review) return
    setReview({ ...review, quote: pendingChange.quote })
    setReviewMessage(null)
    setDialogNotice('Novos valores aceitos. Revise e confirme o pagamento.')
  }

  /** "Confirmar compra": validation → connection → fresh quote → review. */
  const startCheckout = async () => {
    if (preparingRef.current || pendingOrder || attempt.busy) return
    setFormAlert(null)
    const parsed = parseCheckoutForm(form)
    if (!parsed.ok) {
      showFieldErrors(parsed.errors)
      return
    }
    setErrors({})
    if (!wallet) return
    preparingRef.current = true
    setPreparing(true)
    try {
      if (connectionState.status !== 'connected' && !(await connect())) return
      // CHK-05: the review shows a quote fetched now, not whatever was cached.
      let quote: Quote
      try {
        quote = await queryClient.fetchQuery({ ...quoteQuery(ownerKey, parsed.network), staleTime: 0 })
      } catch (error) {
        const message = toApiError(error).message || 'Não foi possível atualizar a cotação. Tente novamente.'
        setFormAlert(message)
        announce(message, 'assertive')
        return
      }
      if (!quote.purchasable || quote.items.length === 0) {
        const message = 'Alguns itens não estão mais disponíveis na quantidade escolhida. Ajuste o carrinho para continuar.'
        setFormAlert(message)
        announce(message, 'assertive')
        return
      }
      setCheck(null)
      setReviewMessage(null)
      setDialogNotice('')
      setReview({ quote, buyer: parsed.buyer, network: parsed.network, wallet })
      setDialogNotice('Revise o pedido antes de confirmar o pagamento.')
    } finally {
      preparingRef.current = false
      setPreparing(false)
    }
  }

  /** "Confirmar pagamento" inside the review. */
  const confirmPayment = async () => {
    const current = review
    if (!current || pendingChange || checking) return
    setReviewMessage(null)
    setDialogNotice('Enviando pedido…')
    const result = await attempt.submit({
      quoteId: current.quote.id,
      walletId: current.wallet.id,
      network: current.network,
      buyer: current.buyer,
    })
    if (!result) return // duplicate click dropped by the attempt guard
    switch (result.kind) {
      case 'created': {
        clearDraft(userId)
        void queryClient.invalidateQueries({ queryKey: queryKeys.me.activeOrder(userId) })
        announce('Pedido enviado. Aguardando confirmação.')
        void navigate({ to: '/orders/$orderId', params: { orderId: result.order.id } })
        return
      }
      case 'stale': {
        setCheck({ liveSig: 'server', quote: result.quote })
        void queryClient.invalidateQueries({ queryKey: [...queryKeys.cart.byOwner(ownerKey), 'quote'] })
        announce(`${result.message} Aceite os novos valores para continuar.`, 'assertive')
        return
      }
      case 'in-progress': {
        void queryClient.invalidateQueries({ queryKey: queryKeys.me.activeOrder(userId) })
        setReviewMessage({ kind: 'in-progress', text: result.message, orderId: result.orderId })
        announce(result.message, 'assertive')
        return
      }
      case 'error': {
        const { error } = result
        if (error.code === 'WALLET_DISCONNECTED') {
          setConnection({ status: 'disconnected', key: connectionKey(current.wallet.id, current.network, current.buyer.walletKind) })
          const text = 'A carteira foi desconectada. Conecte-a novamente para confirmar o pagamento.'
          setReviewMessage({ kind: 'disconnected', text })
          announce(text, 'assertive')
          return
        }
        if (error.code === 'VALIDATION_ERROR') {
          const mapped = pickFormErrors(error.fieldErrors)
          if (Object.keys(mapped).length > 0) {
            closeReview()
            showFieldErrors(mapped)
            return
          }
        }
        if (error.isRetryable) {
          const text = 'Não foi possível confirmar o pedido. Verifique sua conexão e tente novamente.'
          setReviewMessage({ kind: 'transient', text })
          announce(text, 'assertive')
          return
        }
        const text = error.message || 'Não foi possível confirmar o pedido.'
        setReviewMessage({ kind: 'error', text })
        announce(text, 'assertive')
      }
    }
  }

  /** Reconnects from inside the review after WALLET_DISCONNECTED. */
  const reconnectInReview = async () => {
    const current = review
    if (!current) return
    const key = connectionKey(current.wallet.id, current.network, current.buyer.walletKind)
    setConnection({ status: 'connecting', key })
    announce('Conectando carteira…')
    try {
      await connectWallet(current.wallet.id, current.network, current.buyer.walletKind)
      setConnection({ status: 'connected', key })
      setReviewMessage(null)
      setDialogNotice('Carteira conectada. Confirme o pagamento.')
    } catch (error) {
      const apiError = toApiError(error)
      const text =
        apiError.code === 'WALLET_REJECTED'
          ? 'A carteira recusou a conexão. Tente novamente ou volte e escolha outra carteira.'
          : apiError.message || 'Não foi possível conectar a carteira.'
      setConnection({ status: apiError.code === 'WALLET_REJECTED' ? 'rejected' : 'error', key, message: text })
      setReviewMessage({ kind: 'disconnected', text })
      announce(text, 'assertive')
    }
  }

  /* ------------------------ realtime notice (RT-09) ------------------------ */

  const [updateNotice, setUpdateNotice] = useState<string | null>(null)
  useRealtimeEvent('nft.updated', (event) => {
    if (review) return // the review has its own stale flow
    const line = liveQuote?.items.find((item) => item.nftId === event.data.nftId)
    if (!line) return
    const text = `O preço ou a disponibilidade de ${line.name} mudou. O resumo foi atualizado.`
    setUpdateNotice(text)
    announce(text)
  })

  const blockedReason = pendingOrder ? 'Você tem um pedido aguardando confirmação.' : null

  return {
    form,
    errors,
    formAlert,
    fieldId,
    errorId,
    setValue,
    setNetwork,
    setWalletKind,
    setSlot,
    collectorOpen,
    setCollectorOpen,
    network,
    wallet,
    wallets,
    quote: quoteQueryResult,
    pendingOrder,
    blockedReason,
    connection: connectionState,
    connect,
    disconnect,
    preparing,
    startCheckout,
    review,
    pendingChange,
    checking,
    reviewMessage,
    dialogNotice,
    closeReview,
    acceptNewValues,
    confirmPayment,
    reconnectInReview,
    phase: attempt.phase,
    busy: attempt.busy,
    updateNotice,
    dismissUpdateNotice: () => setUpdateNotice(null),
  }
}

export type CheckoutController = ReturnType<typeof useCheckout>
