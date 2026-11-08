import Big from 'big.js'
import { useRef, useState } from 'react'
import { useAnnounce } from '@/shared/a11y/announcer'
import type { CartItem } from '@/shared/contracts'
import { formatEth } from '@/shared/lib/format'
import { useRealtimeEvent } from '@/shared/realtime/realtime-provider'
import { remaining } from './lib/lines'

export interface RealtimeNotice {
  messages: string[]
  /** The line can no longer be bought as it is (sold out or quantity above the new stock). */
  urgent: boolean
  /** Price announced by the event; used to drop the notice if REST disagrees (stale event). */
  price: string
  at: number
}

/**
 * CART-07 — what changed on the open cart. The cache refetch of cart + quote is done by
 * cache-sync.ts; here the event is compared with the cart lines of the LAST render (still the
 * previous version: React has not re-rendered yet) to tell the user what changed on each line.
 * A notice stays until dismissed or replaced by the next change, and is announced (polite;
 * assertive when the line became unpurchasable).
 */
export function useCartRealtimeNotices(items: CartItem[], cartUpdatedAt: number) {
  const announce = useAnnounce()
  const [notices, setNotices] = useState<Record<string, RealtimeNotice>>({})
  /** Latest NFT version seen per NFT: duplicated or out-of-order events are ignored (RT-05). */
  const versions = useRef<Record<string, number>>({})

  useRealtimeEvent('nft.updated', (event) => {
    const { nftId, editions } = event.data
    if (event.version <= (versions.current[nftId] ?? -1)) return
    versions.current[nftId] = event.version

    const next: Record<string, RealtimeNotice> = {}
    const spoken: string[] = []
    let urgent = false
    for (const line of items) {
      if (line.nftId !== nftId) continue
      const after = editions.find((e) => e.id === line.editionId)
      if (!after) continue
      const messages: string[] = []
      let lineUrgent = false
      if (!new Big(line.unitPrice).eq(after.price)) {
        messages.push(`Preço atualizado: ${formatEth(line.unitPrice, { suffix: false })} → ${formatEth(after.price)}`)
      }
      if (after.available !== line.available) {
        if (after.available === 0) {
          messages.push('Esgotado')
          lineUrgent = true
        } else {
          messages.push(remaining(after.available))
          if (after.available < line.quantity) lineUrgent = true
        }
      }
      if (messages.length === 0) continue
      next[line.id] = { messages, urgent: lineUrgent, price: after.price, at: Date.now() }
      spoken.push(`${line.name}, edição ${line.editionLabel}: ${messages.join('. ')}.`)
      urgent ||= lineUrgent
    }
    if (spoken.length === 0) return
    setNotices((prev) => ({ ...prev, ...next }))
    announce(`Carrinho atualizado. ${spoken.join(' ')}`, urgent ? 'assertive' : 'polite')
  })

  function dismiss(itemId: string) {
    setNotices(({ [itemId]: _removed, ...rest }) => rest)
  }

  /**
   * Notice of a line, unless the cart refetched AFTER the event and the server price differs
   * from the event's (the event was stale): REST is the authority.
   */
  function noticeFor(item: CartItem): RealtimeNotice | null {
    const notice = notices[item.id]
    if (!notice) return null
    if (cartUpdatedAt > notice.at && !new Big(item.unitPrice).eq(notice.price)) return null
    return notice
  }

  return { noticeFor, dismiss }
}

export type CartRealtimeNotices = ReturnType<typeof useCartRealtimeNotices>
