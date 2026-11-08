import { z } from 'zod'
import { idSchema, isoDateSchema, moneySchema } from './common'

export const NETWORKS = ['ethereum', 'polygon', 'solana'] as const
export const networkSchema = z.enum(NETWORKS)
export type Network = z.infer<typeof networkSchema>
export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

/** "Coleções" in the Figma sidebar; slugs travel in the URL and in the API query. */
export const CATEGORIES = [
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'gaming',
  'subscriptions',
  'utility',
] as const
export const categorySchema = z.enum(CATEGORIES)
export type Category = z.infer<typeof categorySchema>
export const CATEGORY_LABELS: Record<Category, string> = {
  'digital-art': 'Arte digital',
  photography: 'Fotografia',
  music: 'Música',
  '3d-art': 'Arte 3D',
  collectibles: 'Colecionáveis',
  generative: 'Generativa',
  gaming: 'Jogos',
  subscriptions: 'Assinaturas',
  utility: 'Utilidade',
}

export const CATALOG_TABS = ['all', 'new', 'trending'] as const
export const catalogTabSchema = z.enum(CATALOG_TABS)
export type CatalogTab = z.infer<typeof catalogTabSchema>

export const CATALOG_SORTS = ['recent', 'price-asc', 'price-desc', 'name'] as const
export const catalogSortSchema = z.enum(CATALOG_SORTS)
export type CatalogSort = z.infer<typeof catalogSortSchema>

export const raritySchema = z.enum(['common', 'rare', 'legendary'])
export type Rarity = z.infer<typeof raritySchema>

export const editionKindSchema = z.enum(['unique', 'limited-10', 'limited-50', 'open'])
export type EditionKind = z.infer<typeof editionKindSchema>

export const editionSchema = z.object({
  id: idSchema,
  kind: editionKindSchema,
  /** "1/1", "1/10", "1/50", "ABERTA" */
  label: z.string(),
  /** null = open edition (no fixed supply) */
  supply: z.number().int().positive().nullable(),
  available: z.number().int().nonnegative(),
  price: moneySchema,
})
export type Edition = z.infer<typeof editionSchema>

export const nftSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  image: z.string(),
  category: categorySchema,
  collection: z.string(),
  collectionSlug: z.string(),
  network: networkSchema,
  /** Price of the default edition. */
  price: moneySchema,
  /** Strike-through price ("2.29 ETH" in the Figma), when on sale. */
  compareAtPrice: moneySchema.nullable(),
  /** Units available across every edition. */
  available: z.number().int().nonnegative(),
  isNew: z.boolean(),
  isTrending: z.boolean(),
  rarity: raritySchema,
  createdAt: isoDateSchema,
  version: z.number().int().nonnegative(),
})
export type NftSummary = z.infer<typeof nftSummarySchema>

export const reviewSchema = z.object({
  id: idSchema,
  author: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: isoDateSchema,
})
export type Review = z.infer<typeof reviewSchema>

export const attributeSchema = z.object({ trait: z.string(), value: z.string() })
export type Attribute = z.infer<typeof attributeSchema>

export const nftImageSchema = z.object({ url: z.string(), alt: z.string() })

export const nftDetailSchema = nftSummarySchema.extend({
  tokenId: z.string(),
  creator: z.string(),
  description: z.string(),
  longDescription: z.array(z.string()),
  images: z.array(nftImageSchema).min(1),
  rating: z.number().min(0).max(5),
  reviewsCount: z.number().int().nonnegative(),
  reviews: z.array(reviewSchema),
  attributes: z.array(attributeSchema),
  contractAddress: z.string(),
  tokenStandard: z.string(),
  royaltyPercent: z.string(),
  networkNote: z.string(),
  defaultEditionId: idSchema,
  editions: z.array(editionSchema).min(1),
})
export type NftDetail = z.infer<typeof nftDetailSchema>

export const facetOptionSchema = z.object({ slug: z.string(), label: z.string(), count: z.number().int().nonnegative() })
export type FacetOption = z.infer<typeof facetOptionSchema>

export const catalogFacetsSchema = z.object({
  categories: z.array(facetOptionSchema),
  networks: z.array(facetOptionSchema),
  priceRange: z.object({ min: moneySchema, max: moneySchema }),
})
export type CatalogFacets = z.infer<typeof catalogFacetsSchema>

export const nftListResponseSchema = z.object({
  items: z.array(nftSummarySchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  facets: catalogFacetsSchema,
})
export type NftListResponse = z.infer<typeof nftListResponseSchema>

export const featuredResponseSchema = z.object({
  /** Hero artwork. */
  hero: nftSummarySchema,
  /** "NFT em destaque / Oferta limitada" card in the sidebar. */
  spotlight: nftSummarySchema,
})
export type FeaturedResponse = z.infer<typeof featuredResponseSchema>

export const relatedResponseSchema = z.object({ items: z.array(nftSummarySchema) })

/* ------------------------------------------------------------------------------------------
 * Catalog query = URL search params = API query params (CAT-02..CAT-06).
 * The router keeps search values as raw strings (see app/router.tsx), so this single schema
 * validates the URL and the MSW handler validates the request with it too. Defaults are left
 * out of the URL (undefined) so canonical URLs stay short. Malformed values fall back to the
 * default instead of breaking the page.
 * ---------------------------------------------------------------------------------------- */

function csvOf<T extends string>(allowed: readonly T[]) {
  return z
    .string()
    .transform((raw) => {
      const values = [...new Set(raw.split(',').map((v) => v.trim()))].filter((v): v is T =>
        (allowed as readonly string[]).includes(v),
      )
      // keep a canonical order so equal filters produce equal URLs and query keys
      return allowed.filter((v) => values.includes(v)).join(',')
    })
    .transform((v) => (v === '' ? undefined : v))
}

const optionalMoney = z
  .string()
  .trim()
  .transform((v) => (/^\d+(\.\d+)?$/.test(v) ? v : undefined))

export const catalogSearchSchema = z.object({
  q: z
    .string()
    .trim()
    .max(80)
    .transform((v) => (v === '' ? undefined : v))
    .optional()
    .catch(undefined),
  tab: catalogTabSchema.optional().catch(undefined),
  category: csvOf(CATEGORIES).optional().catch(undefined),
  network: csvOf(NETWORKS).optional().catch(undefined),
  minPrice: optionalMoney.optional().catch(undefined),
  maxPrice: optionalMoney.optional().catch(undefined),
  sort: catalogSortSchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(999).optional().catch(undefined),
})
export type CatalogSearch = z.output<typeof catalogSearchSchema>

export const CATALOG_PAGE_SIZE = 9
