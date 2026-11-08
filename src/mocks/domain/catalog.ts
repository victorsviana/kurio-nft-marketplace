import Big from 'big.js'
import {
  CATALOG_PAGE_SIZE,
  CATEGORIES,
  CATEGORY_LABELS,
  NETWORK_LABELS,
  NETWORKS,
  type CatalogSearch,
  type Edition,
  type NftDetail,
  type NftListResponse,
  type NftSummary,
} from '@/shared/contracts'
import { artImage, CATALOG_NOW, NEW_WINDOW_MS } from '../db/fixtures'
import type { NftRecord } from '../db/types'

export function defaultEdition(nft: Pick<NftRecord, 'editions' | 'defaultEditionId'>): Edition {
  return nft.editions.find((e) => e.id === nft.defaultEditionId) ?? nft.editions[0]!
}

export function totalAvailable(nft: Pick<NftRecord, 'editions'>): number {
  return nft.editions.reduce((sum, e) => sum + e.available, 0)
}

export function toSummary(nft: NftRecord): NftSummary {
  return {
    id: nft.id,
    name: nft.name,
    image: artImage(nft.art),
    category: nft.category,
    collection: nft.collection,
    collectionSlug: nft.collectionSlug,
    network: nft.network,
    price: defaultEdition(nft).price,
    compareAtPrice: nft.compareAtPrice,
    available: totalAvailable(nft),
    isNew: CATALOG_NOW - Date.parse(nft.createdAt) <= NEW_WINDOW_MS,
    isTrending: nft.isTrending,
    rarity: nft.rarity,
    createdAt: nft.createdAt,
    version: nft.version,
  }
}

export function toDetail(nft: NftRecord): NftDetail {
  const summary = toSummary(nft)
  const networkLabel = NETWORK_LABELS[nft.network]
  return {
    ...summary,
    tokenId: nft.tokenId,
    creator: nft.creator,
    description: nft.description,
    longDescription: nft.longDescription,
    images: [1, 2, 3, 4].map((n) => ({ url: summary.image, alt: `${nft.name} — imagem ${n} de 4` })),
    rating: nft.rating,
    reviewsCount: nft.reviewsCount,
    reviews: nft.reviews,
    attributes: nft.attributes,
    contractAddress: nft.contractAddress,
    tokenStandard: nft.network === 'solana' ? 'Metaplex' : 'ERC-721',
    royaltyPercent: nft.royaltyPercent,
    networkNote: `Cunhado na ${networkLabel} com procedência imutável e metadados armazenados no IPFS.`,
    defaultEditionId: nft.defaultEditionId,
    editions: nft.editions,
  }
}

type Filters = Omit<CatalogSearch, 'sort' | 'page'>

function matches(nft: NftRecord, filters: Filters, ignore?: 'category' | 'network'): boolean {
  const summary = toSummary(nft)
  if (filters.q) {
    const q = filters.q.toLowerCase()
    const haystack = `${nft.name} ${nft.collection} ${nft.creator}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  if (filters.tab === 'new' && !summary.isNew) return false
  if (filters.tab === 'trending' && !summary.isTrending) return false
  if (ignore !== 'category' && filters.category && !filters.category.split(',').includes(nft.category)) return false
  if (ignore !== 'network' && filters.network && !filters.network.split(',').includes(nft.network)) return false
  const price = new Big(summary.price)
  if (filters.minPrice && price.lt(filters.minPrice)) return false
  if (filters.maxPrice && price.gt(filters.maxPrice)) return false
  return true
}

const SORTERS: Record<NonNullable<CatalogSearch['sort']>, (a: NftSummary, b: NftSummary) => number> = {
  recent: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id),
  'price-asc': (a, b) => new Big(a.price).cmp(b.price) || a.id.localeCompare(b.id),
  'price-desc': (a, b) => new Big(b.price).cmp(a.price) || a.id.localeCompare(b.id),
  name: (a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id),
}

/**
 * Faceted catalog query. Each facet count applies every active filter except its own
 * dimension, so the sidebar shows how many results each option would produce (CAT-03).
 */
export function queryCatalog(all: NftRecord[], params: CatalogSearch, options: { empty?: boolean } = {}): NftListResponse {
  const nfts = options.empty ? [] : all
  const filtered = nfts.filter((n) => matches(n, params)).map(toSummary)
  filtered.sort(SORTERS[params.sort ?? 'recent'])

  const pageSize = CATALOG_PAGE_SIZE
  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize)
  const page = params.page ?? 1
  const items = filtered.slice((page - 1) * pageSize, page * pageSize)

  const prices = all.map((n) => new Big(defaultEdition(n).price))
  const min = prices.reduce((a, b) => (b.lt(a) ? b : a), prices[0] ?? new Big(0))
  const max = prices.reduce((a, b) => (b.gt(a) ? b : a), prices[0] ?? new Big(0))

  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    facets: {
      categories: CATEGORIES.map((slug) => ({
        slug,
        label: CATEGORY_LABELS[slug],
        count: nfts.filter((n) => n.category === slug && matches(n, params, 'category')).length,
      })),
      networks: NETWORKS.map((slug) => ({
        slug,
        label: NETWORK_LABELS[slug],
        count: nfts.filter((n) => n.network === slug && matches(n, params, 'network')).length,
      })),
      priceRange: { min: min.toString(), max: max.toString() },
    },
  }
}

export function relatedTo(all: NftRecord[], nft: NftRecord, limit = 15): NftSummary[] {
  return all
    .filter((n) => n.collectionSlug === nft.collectionSlug && n.id !== nft.id)
    .slice(0, limit)
    .map(toSummary)
}
