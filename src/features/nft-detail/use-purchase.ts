import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import Big from 'big.js'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAnnounce } from '@/shared/a11y/announcer'
import { unitsInCart, useAddToCart, useCart } from '@/shared/api/endpoints/cart'
import { nftDetailQuery } from '@/shared/api/endpoints/nfts'
import { toApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/query-keys'
import type { NftDetail } from '@/shared/contracts'
import { formatEth } from '@/shared/lib/format'
import { useRealtimeEvent } from '@/shared/realtime/realtime-provider'
import { initialEditionId, isSoldOut, unitsLabel } from './lib/editions'

export type PurchaseFeedback = { kind: 'success' | 'error'; message: string }

/**
 * Selection and purchase state of the detail screen (NFT-04, NFT-05, NFT-06, RT-02).
 *
 * Nothing that comes from the server is copied into state: price and availability are read
 * from the query data on every render, so a realtime patch of the cache (cache-sync.ts)
 * shows up immediately. Only the user's intent is local: chosen edition and the raw quantity,
 * which is clamped on render to `available - unitsInCart` (NFT-05).
 */
export function usePurchase(nft: NftDetail) {
  const announce = useAnnounce()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: cart } = useCart()
  const addToCart = useAddToCart()

  const [editionId, setEditionId] = useState(() => initialEditionId(nft))
  const [rawQuantity, setRawQuantity] = useState(1)
  const [feedback, setFeedback] = useState<PurchaseFeedback | null>(null)
  const [priceChangedAt, setPriceChangedAt] = useState<number | null>(null)

  const edition = nft.editions.find((e) => e.id === editionId) ?? nft.editions[0]!
  const inCart = unitsInCart(cart, edition.id)
  const max = Math.max(0, edition.available - inCart)
  const quantity = max === 0 ? 0 : Math.min(Math.max(1, rawQuantity), max)
  const allSoldOut = nft.editions.every(isSoldOut)

  /** Visible reason whenever buying is impossible (never only a disabled color, A11Y-05). */
  const blockedReason = allSoldOut
    ? 'Este NFT está esgotado em todas as edições.'
    : isSoldOut(edition)
      ? `A edição ${edition.label} está esgotada. Escolha outra edição.`
      : max === 0
        ? `Todas as unidades disponíveis da edição ${edition.label} já estão no seu carrinho.`
        : null

  const canBuy = max > 0 && !addToCart.isPending

  // "Preço atualizado" chip fades out a few seconds after a realtime price change.
  useEffect(() => {
    if (priceChangedAt === null) return
    const timer = window.setTimeout(() => setPriceChangedAt(null), 4_000)
    return () => window.clearTimeout(timer)
  }, [priceChangedAt])

  function selectEdition(id: string) {
    const next = nft.editions.find((e) => e.id === id)
    if (!next || isSoldOut(next) || id === editionId) return
    setEditionId(id)
    setRawQuantity(1)
    setFeedback(null)
    announce(`Edição ${next.label} selecionada: ${formatEth(next.price)}, ${unitsLabel(next.available)} disponíveis.`)
  }

  function increment() {
    if (max === 0) return
    if (quantity >= max) {
      announce(`Limite atingido: ${unitsLabel(max)} disponível${max === 1 ? '' : 'is'} para você nesta edição.`)
      return
    }
    const next = quantity + 1
    setRawQuantity(next)
    setFeedback(null)
    announce(next === max ? `Quantidade ${next}. Este é o máximo disponível.` : `Quantidade ${next}.`)
  }

  function decrement() {
    if (max === 0) return
    if (quantity <= 1) {
      announce('A quantidade mínima é 1.')
      return
    }
    const next = quantity - 1
    setRawQuantity(next)
    setFeedback(null)
    announce(`Quantidade ${next}.`)
  }

  function buy() {
    if (!canBuy) {
      if (blockedReason) announce(blockedReason, 'assertive')
      return
    }
    const bought = { quantity, label: edition.label }
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => {
          const added = `${unitsLabel(bought.quantity)} da edição ${bought.label} ${bought.quantity === 1 ? 'adicionada' : 'adicionadas'} ao carrinho.`
          setRawQuantity(1)
          setFeedback({ kind: 'success', message: added })
          toast.success('Adicionado ao carrinho', {
            description: `${nft.name}: ${added}`,
            action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/cart' }) },
          })
          announce(`${nft.name}: ${added}`)
        },
        onError: (error) => {
          const apiError = toApiError(error)
          setFeedback({ kind: 'error', message: apiError.message })
          toast.error('Não foi possível adicionar ao carrinho', { description: apiError.message })
          announce(`Não foi possível adicionar ao carrinho. ${apiError.message}`, 'assertive')
          // The server knows better (409 INSUFFICIENT_AVAILABILITY, edition gone): reload the
          // detail and the cart so the selectable maximum reflects the real stock.
          if (apiError.status === 409 || apiError.status === 404) {
            void queryClient.invalidateQueries({ queryKey: nftDetailQuery(nft.id).queryKey })
            void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
          }
        },
      },
    )
  }

  /*
   * Realtime UX (RT-02, A11Y-04). The cache itself is patched by cache-sync.ts; here the
   * event is compared with the data of the last render (still the previous version, React has
   * not re-rendered yet) to tell the user what changed on the NFT they are looking at.
   */
  useRealtimeEvent('nft.updated', (event) => {
    if (event.data.nftId !== nft.id || event.version <= nft.version) return
    const before = nft.editions.find((e) => e.id === editionId)
    const after = event.data.editions.find((e) => e.id === editionId)
    if (!before || !after) return

    const messages: string[] = []
    let urgent = false
    if (!new Big(before.price).eq(after.price)) {
      messages.push(`Preço atualizado para ${formatEth(after.price)}.`)
      setPriceChangedAt(Date.now())
    }
    if (after.available !== before.available) {
      const nextMax = Math.max(0, after.available - inCart)
      if (after.available === 0) {
        messages.push(`A edição ${after.label} esgotou. Escolha outra edição.`)
        urgent = true
      } else if (quantity > nextMax) {
        setRawQuantity(Math.max(1, nextMax))
        messages.push(
          nextMax === 0
            ? `Disponibilidade reduzida: as unidades restantes da edição ${after.label} já estão no seu carrinho.`
            : `Disponibilidade reduzida: quantidade ajustada para ${nextMax}.`,
        )
        urgent = true
      } else {
        messages.push(`Edição ${after.label}: ${unitsLabel(after.available)} disponíveis.`)
      }
    }
    for (const changed of event.data.editions) {
      if (changed.id === editionId) continue
      const previous = nft.editions.find((e) => e.id === changed.id)
      if (previous && !isSoldOut(previous) && isSoldOut(changed)) messages.push(`A edição ${changed.label} esgotou.`)
    }
    if (messages.length > 0) {
      setFeedback(null)
      announce(messages.join(' '), urgent ? 'assertive' : 'polite')
    }
  })

  return {
    edition,
    editionId: edition.id,
    quantity,
    max,
    inCart,
    blockedReason,
    feedback,
    canBuy,
    pending: addToCart.isPending,
    priceRecentlyChanged: priceChangedAt !== null,
    selectEdition,
    increment,
    decrement,
    buy,
  }
}

export type PurchaseState = ReturnType<typeof usePurchase>
