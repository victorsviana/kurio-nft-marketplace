import { useState } from 'react'
import { toast } from 'sonner'
import { useAnnounce } from '@/shared/a11y/announcer'
import { useRemoveCartItem, useUpdateCartItem } from '@/shared/api/endpoints/cart'
import { toApiError } from '@/shared/api/errors'
import type { CartItem } from '@/shared/contracts'
import { units } from './lib/lines'

/**
 * Controls of ONE cart line (CART-01, CART-02). Each line owns its mutations, so "pending" and
 * the inline API error (409 INSUFFICIENT_AVAILABILITY) belong to that line only. Nothing is
 * optimistic: the quantity on screen is always the server's (see endpoints/cart.ts).
 *
 * `mutateAsync().then()` instead of per-call `mutate` callbacks: a successful removal unmounts
 * the line, and per-call callbacks do not run after unmount (the toast/announcement would be lost).
 */
export function useCartLine(item: CartItem) {
  const announce = useAnnounce()
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const [error, setError] = useState<string | null>(null)

  const pending = update.isPending || remove.isPending
  const max = item.available
  const canDecrement = !pending && item.quantity > 1
  const canIncrement = !pending && item.quantity < max
  /** Why "+" is disabled at the stock limit (sr text + tooltip, never color only). */
  const limitReason =
    max === 0
      ? `A edição ${item.editionLabel} está esgotada.`
      : item.quantity >= max
        ? `Máximo disponível: ${units(max)} da edição ${item.editionLabel}.`
        : null

  function setQuantity(quantity: number) {
    if (pending || quantity < 1 || quantity === item.quantity) return
    setError(null)
    update
      .mutateAsync({ itemId: item.id, quantity })
      .then(() => announce(`Quantidade de ${item.name}: ${quantity}.`))
      .catch((err: unknown) => {
        const apiError = toApiError(err)
        setError(apiError.message)
        toast.error('Não foi possível alterar a quantidade', { description: apiError.message })
        announce(`Não foi possível alterar a quantidade de ${item.name}. ${apiError.message}`, 'assertive')
      })
  }

  function increment() {
    if (pending) return
    if (item.quantity >= max) {
      if (limitReason) announce(`Limite atingido. ${limitReason}`)
      return
    }
    setQuantity(item.quantity + 1)
  }

  function decrement() {
    if (pending) return
    if (item.quantity <= 1) {
      announce('A quantidade mínima é 1. Use o botão de remover para tirar o item do carrinho.')
      return
    }
    setQuantity(item.quantity - 1)
  }

  function removeLine() {
    if (pending) return
    setError(null)
    remove
      .mutateAsync(item.id)
      .then(() => {
        const message = `${item.name} removido do carrinho.`
        toast.success(message)
        announce(message)
      })
      .catch((err: unknown) => {
        const apiError = toApiError(err)
        setError(apiError.message)
        toast.error('Não foi possível remover o item', { description: apiError.message })
        announce(`Não foi possível remover ${item.name}. ${apiError.message}`, 'assertive')
      })
  }

  return { pending, error, max, canDecrement, canIncrement, limitReason, setQuantity, increment, decrement, removeLine }
}

export type CartLineControls = ReturnType<typeof useCartLine>
