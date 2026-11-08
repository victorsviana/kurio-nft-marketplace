import type { Edition, NftDetail } from '@/shared/contracts'

export const isSoldOut = (edition: Pick<Edition, 'available'>) => edition.available === 0

/**
 * Edition selected when the screen opens: the default edition (1/50 in the Figma) unless it
 * is sold out, then the first edition with stock. A fully sold-out NFT keeps the default so
 * the price is still meaningful; the buy controls explain why they are disabled.
 */
export function initialEditionId(nft: Pick<NftDetail, 'editions' | 'defaultEditionId'>): string {
  const fallback = nft.editions.find((e) => e.id === nft.defaultEditionId) ?? nft.editions[0]!
  if (!isSoldOut(fallback)) return fallback.id
  return (nft.editions.find((e) => !isSoldOut(e)) ?? fallback).id
}

export const unitsLabel = (n: number) => `${n} ${n === 1 ? 'unidade' : 'unidades'}`

export const reviewsLabel = (n: number) => `${n} ${n === 1 ? 'avaliação de colecionador' : 'avaliações de colecionadores'}`

/** Rating as printed in the Figma ("4.8"): one decimal, dot separator. */
export const formatRating = (rating: number) => rating.toFixed(1)
