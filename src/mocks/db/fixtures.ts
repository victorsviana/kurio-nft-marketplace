import Big from 'big.js'
import {
  NETWORK_LABELS,
  type Category,
  type Edition,
  type EditionKind,
  type Network,
  type Rarity,
  type Review,
} from '@/shared/contracts'
import { hashPassword } from '../lib/crypto'
import type { CouponRecord, DbState, NftRecord, UserRecord, WalletPair } from './types'

/**
 * Deterministic seed of the simulated backend (MOCK-05). A seeded PRNG, fixed timestamps and
 * slug ids make every reset produce byte-identical data, which keeps E2E assertions and the
 * visual baselines stable. Only 4 distinct artworks exist in the Figma file, so the catalog
 * reuses them (asset substitution documented in ARCHITECTURE.md).
 */

export const SCHEMA_VERSION = 2
/** Fixed "catalog clock": `isNew` and `createdAt` are relative to it, never to Date.now(). */
export const CATALOG_NOW = Date.parse('2026-11-01T12:00:00.000Z')
export const NEW_WINDOW_MS = 4 * 24 * 60 * 60 * 1000
export const DEMO_PASSWORD = 'kurio2026'

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Art = 'emerald-ape' | 'sage-nomad' | 'neon-vessel' | 'golden-beat'

export const artImage = (art: string) => `/images/nft/${art}-512.webp`

const ART_TRAITS: Record<Art, [string, string][]> = {
  'emerald-ape': [
    ['Acessório', 'Óculos'],
    ['Gema', 'Esmeralda'],
    ['Traje', 'Jaqueta universitária'],
  ],
  'sage-nomad': [
    ['Acessório', 'Chapéu bucket'],
    ['Traje', 'Moletom lavanda'],
    ['Expressão', 'Serena'],
  ],
  'neon-vessel': [
    ['Traje', 'Blazer marfim'],
    ['Gola', 'Alta'],
    ['Expressão', 'Determinada'],
  ],
  'golden-beat': [
    ['Acessório', 'Fones'],
    ['Pelagem', 'Âmbar'],
    ['Traje', 'Jaqueta creme'],
  ],
}

const ART_NOUNS: Record<Art, string[]> = {
  'emerald-ape': ['Ape', 'Monk', 'Pilot', 'Sentinel'],
  'sage-nomad': ['Nomad', 'Bloom', 'Drifter', 'Wanderer'],
  'neon-vessel': ['Vessel', 'Baron', 'Echo', 'Regent'],
  'golden-beat': ['Beat', 'Frequency', 'Signal', 'Rhythm'],
}
const ADJECTIVES = [
  'Amber', 'Crimson', 'Obsidian', 'Copper', 'Velvet', 'Lunar', 'Solar', 'Rust', 'Jade', 'Indigo',
  'Scarlet', 'Silent', 'Hidden', 'Electric', 'Midnight', 'Coral', 'Onyx', 'Saffron', 'Cobalt', 'Ember',
]
const COLLECTIONS: [string, string][] = [
  ['Kurio Apes', 'kurio-apes'],
  ['Kurio Editions', 'kurio-editions'],
  ['Nomad Club', 'nomad-club'],
  ['Neon Society', 'neon-society'],
  ['Golden Waves', 'golden-waves'],
  ['Genesis Drop', 'genesis-drop'],
]
const CREATORS = ['Nova Sato', 'Lia Monteiro', 'Kenji Duarte', 'Iris Vale', 'Theo Braga', 'Maya Okafor']
const REVIEW_AUTHORS = [
  'colecionador.eth', 'marina.art', 'pixelnomad', 'joao.web3', 'luana.coleciona', 'drop.hunter',
  'cripto.carol', 'rafa.nft', 'galeria.sp', 'satoshi.br', 'bia.mints', 'kurio.fan',
]
const REVIEW_COMMENTS: [number, string][] = [
  [5, 'Arte impecável e a procedência verificada me deu segurança na compra.'],
  [5, 'Os detalhes em alta resolução são ainda melhores do que na prévia.'],
  [4, 'Ótima peça para a coleção; a entrega dos benefícios foi rápida.'],
  [5, 'Comunidade ativa e lançamentos exclusivos valem cada ETH.'],
  [4, 'Gostei muito da paleta. Só queria mais variações de edição.'],
  [5, 'Uma das melhores obras da coleção, sem dúvida.'],
  [3, 'Bonito, mas a taxa de rede no dia estava alta.'],
  [5, 'Criador muito atencioso e roadmap transparente.'],
  [4, 'Compra simples e o recibo ficou bem detalhado.'],
]

/* Weights taken from the Figma sidebar counts, so the facets look like the design. */
const CATEGORY_WEIGHTS: Record<Category, number> = {
  'digital-art': 33,
  photography: 12,
  music: 65,
  '3d-art': 39,
  collectibles: 23,
  generative: 17,
  gaming: 19,
  subscriptions: 13,
  utility: 18,
}
const NETWORK_WEIGHTS: Record<Network, number> = { ethereum: 119, polygon: 78, solana: 86 }

function weighted<T extends string>(rand: () => number, weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][]
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let roll = rand() * total
  for (const [key, w] of entries) {
    roll -= w
    if (roll < 0) return key
  }
  return entries[entries.length - 1]![0]
}

const pick = <T,>(rand: () => number, list: readonly T[]): T => list[Math.floor(rand() * list.length)]!
const money = (value: Big.BigSource, dp = 2) => new Big(value).round(dp, Big.roundHalfUp).toString()
const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/#/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const EDITION_LABEL: Record<EditionKind, string> = {
  unique: '1/1',
  'limited-10': '1/10',
  'limited-50': '1/50',
  open: 'ABERTA',
}
const EDITION_MULTIPLIER: Record<EditionKind, string> = {
  unique: '5',
  'limited-10': '2',
  'limited-50': '1',
  open: '0.5',
}

function buildEditions(
  nftId: string,
  basePrice: string,
  kinds: EditionKind[],
  available: Partial<Record<EditionKind, number>>,
): Edition[] {
  // The default edition (1/50 when present) always carries the base price; the others scale from it.
  const defaultKind: EditionKind = kinds.includes('limited-50') ? 'limited-50' : kinds[0]!
  return kinds.map((kind) => ({
    id: `${nftId}.${kind}`,
    kind,
    label: EDITION_LABEL[kind],
    supply: kind === 'unique' ? 1 : kind === 'limited-10' ? 10 : kind === 'limited-50' ? 50 : null,
    available: available[kind] ?? (kind === 'open' ? 500 : 1),
    price: money(new Big(basePrice).times(EDITION_MULTIPLIER[kind]).div(EDITION_MULTIPLIER[defaultKind]), 3),
  }))
}

function buildReviews(rand: () => number, nftId: string, count: number, createdAt: number): Review[] {
  return Array.from({ length: count }, (_, i) => {
    const [rating, comment] = pick(rand, REVIEW_COMMENTS)
    return {
      id: `${nftId}-review-${i + 1}`,
      author: pick(rand, REVIEW_AUTHORS),
      rating,
      comment,
      createdAt: new Date(createdAt + (i + 1) * 9 * 3600_000).toISOString(),
    }
  })
}

interface NftSeed {
  name: string
  art: Art
  price: string
  compareAtPrice?: string | null
  rarity?: Rarity
  category?: Category
  network?: Network
  isTrending?: boolean
  reviewsCount?: number
  collection?: [string, string]
  kinds?: EditionKind[]
  available?: Partial<Record<EditionKind, number>>
}

/** The first 9 items reproduce the Figma grid (newest first, "Listados recentemente"). */
const FIGMA_GRID: NftSeed[] = [
  {
    name: 'Emerald Ape #042',
    art: 'emerald-ape',
    price: '1.19',
    category: 'digital-art',
    network: 'ethereum',
    isTrending: true,
    reviewsCount: 19,
    kinds: ['unique', 'limited-10', 'limited-50', 'open'],
    available: { unique: 0, 'limited-10': 4, 'limited-50': 12 },
  },
  { name: 'Sage Nomad #009', art: 'sage-nomad', price: '1.69', category: 'music', network: 'polygon' },
  {
    name: 'Neon Vessel #552',
    art: 'neon-vessel',
    price: '1.99',
    compareAtPrice: '2.29',
    rarity: 'rare',
    category: '3d-art',
    network: 'ethereum',
    isTrending: true,
  },
  { name: 'Cosmic Bloom #118', art: 'sage-nomad', price: '1.29', category: 'digital-art', network: 'solana' },
  { name: 'Violet Nomad #314', art: 'sage-nomad', price: '1.39', category: 'collectibles', network: 'ethereum' },
  { name: 'Ivory Baron #088', art: 'neon-vessel', price: '1.79', category: 'photography', network: 'polygon', isTrending: true },
  { name: 'Golden Beat #207', art: 'golden-beat', price: '0.99', category: 'music', network: 'ethereum' },
  { name: 'Golden Frequency #071', art: 'golden-beat', price: '0.59', category: 'music', network: 'solana' },
  { name: 'Golden Signal #160', art: 'golden-beat', price: '0.39', category: 'generative', network: 'polygon' },
]

const CATALOG_SIZE = 72
const ARTS: Art[] = ['emerald-ape', 'sage-nomad', 'neon-vessel', 'golden-beat']

function buildNft(rand: () => number, seed: NftSeed, index: number): NftRecord {
  const id = slugify(seed.name)
  const createdAt = CATALOG_NOW - index * 7 * 3600_000 - Math.floor(rand() * 3600_000)
  const network = seed.network ?? weighted(rand, NETWORK_WEIGHTS)
  const category = seed.category ?? weighted(rand, CATEGORY_WEIGHTS)
  const rarity: Rarity = seed.rarity ?? (rand() < 0.08 ? 'legendary' : rand() < 0.24 ? 'rare' : 'common')
  const [collection, collectionSlug] = seed.collection ?? (index < 9 ? COLLECTIONS[0]! : pick(rand, COLLECTIONS))
  const creator = index === 0 ? 'Nova Sato' : pick(rand, CREATORS)
  const tokenNumber = seed.name.match(/#(\d+)/)?.[1] ?? String(index)
  const tokenId = tokenNumber.padStart(4, '0')

  const kinds: EditionKind[] =
    seed.kinds ??
    (rand() < 0.2
      ? ['unique']
      : (['unique', 'limited-10', 'limited-50', 'open'] as EditionKind[]).filter(
          (k) => k === 'limited-50' || rand() < 0.6,
        ))
  const available: Partial<Record<EditionKind, number>> = seed.available ?? {
    unique: rand() < 0.3 ? 0 : 1,
    'limited-10': Math.floor(rand() * 11),
    'limited-50': 3 + Math.floor(rand() * 48),
    open: 500,
  }
  const editions = buildEditions(id, seed.price, kinds, available)
  const defaultEdition = editions.find((e) => e.kind === 'limited-50') ?? editions[0]!

  const reviewsCount = seed.reviewsCount ?? 3 + Math.floor(rand() * 22)
  const reviews = buildReviews(rand, id, reviewsCount, createdAt)
  const rating = reviews.length
    ? Number(money(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length, 1))
    : 0

  const rarityLabel = rarity === 'legendary' ? 'Lendário' : rarity === 'rare' ? 'Raro' : 'Comum'
  const networkLabel = NETWORK_LABELS[network]
  const defaultLabel = defaultEdition.label === 'ABERTA' ? 'de edição aberta' : defaultEdition.label
  const hex = Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(rand() * 16)]).join('')

  return {
    id,
    name: seed.name,
    art: seed.art,
    category,
    collection,
    collectionSlug,
    network,
    compareAtPrice: seed.compareAtPrice ?? (rand() < 0.15 ? money(new Big(seed.price).times('1.15')) : null),
    isTrending: seed.isTrending ?? rand() < 0.3,
    rarity,
    createdAt: new Date(createdAt).toISOString(),
    version: 1,
    tokenId,
    creator,
    description: `Um colecionável digital finalizado à mão da coleção ${collection}, verificado na ${networkLabel}, com arte desbloqueável e acesso para colecionadores.`,
    longDescription: [
      `${seed.name} é uma obra digital ${defaultLabel} finalizada à mão da coleção ${collection}. Cada atributo fica armazenado nos metadados do token e verificado na ${networkLabel}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${creator} recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
    ],
    rating,
    reviewsCount,
    reviews,
    attributes: [...ART_TRAITS[seed.art].slice(0, 2).map(([trait, value]) => ({ trait, value })), { trait: 'Raridade', value: rarityLabel }],
    contractAddress: index === 0 ? '0x7A42c3D9e5F1b2A4c6E8d0F2a4B6c8D0e2F419E8' : `0x${hex}`,
    royaltyPercent: '5',
    defaultEditionId: defaultEdition.id,
    editions,
  }
}

function buildCatalog(): NftRecord[] {
  const rand = mulberry32(20261107)
  const seeds: NftSeed[] = [...FIGMA_GRID]
  const used = new Set(seeds.map((s) => s.name))
  while (seeds.length < CATALOG_SIZE) {
    const art = pick(rand, ARTS)
    const name = `${pick(rand, ADJECTIVES)} ${pick(rand, ART_NOUNS[art])} #${String(100 + Math.floor(rand() * 900))}`
    if (used.has(name)) continue
    used.add(name)
    // skewed distribution between 0.02 and 12.30 ETH, matching the Figma price range
    seeds.push({ name, art, price: money(0.02 + 12.28 * rand() ** 3) })
  }
  // pin the extremes of the price range shown in the Figma ("0,02 - 12,30 ETH")
  seeds[CATALOG_SIZE - 1]!.price = '12.30'
  seeds[CATALOG_SIZE - 2]!.price = '0.02'
  const catalog = seeds.map((seed, index) => buildNft(rand, seed, index))
  // The Figma grid shows no badge and no strike-through price on these cards (only Neon Vessel
  // is rare and on sale). Post-processing keeps the random draws of the other 63 NFTs intact.
  for (const nft of catalog.slice(0, FIGMA_GRID.length)) {
    if (nft.id === 'neon-vessel-552') continue
    nft.rarity = 'common'
    nft.compareAtPrice = null
    nft.attributes = nft.attributes.map((a) => (a.trait === 'Raridade' ? { ...a, value: 'Comum' } : a))
  }
  // a fully sold-out NFT for the "esgotado" state
  const soldOut = catalog[20]!
  soldOut.editions = soldOut.editions.map((e) => ({ ...e, available: 0 }))
  return catalog
}

const SEED_TIME = '2026-10-15T12:00:00.000Z'

async function buildUser(
  id: string,
  displayName: string,
  username: string,
  email: string,
  extra: Pick<UserRecord, 'ensName' | 'walletNickname'>,
): Promise<UserRecord> {
  const salt = `salt-${id}`
  return {
    id,
    displayName,
    username,
    email,
    ...extra,
    avatarUrl: null,
    salt,
    passwordHash: await hashPassword(DEMO_PASSWORD, salt),
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  }
}

const COUPONS: CouponRecord[] = [
  { code: 'KURIO10', percentOff: '10', expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'BEMVINDO5', percentOff: '5', expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'BLACKFRIDAY', percentOff: '15', expiresAt: '2025-11-30T23:59:59.000Z' },
]

export const DEFAULT_NETWORK_FEES = { ethereum: '0.016', polygon: '0.002', solana: '0.0005' } as const

export const DEMO_USERS = {
  ana: { id: 'user-ana', email: 'ana@kurio.dev', password: DEMO_PASSWORD },
  bruno: { id: 'user-bruno', email: 'bruno@kurio.dev', password: DEMO_PASSWORD },
} as const

export async function createSeed(): Promise<DbState> {
  const users = await Promise.all([
    buildUser('user-ana', 'Ana Ribeiro', 'ana.ribeiro', 'ana@kurio.dev', {
      ensName: 'anaribeiro.eth',
      walletNickname: 'Cofre da Ana',
    }),
    buildUser('user-bruno', 'Bruno Costa', 'bruno.costa', 'bruno@kurio.dev', {
      ensName: '',
      walletNickname: '',
    }),
  ])
  const wallets: Record<string, WalletPair> = {
    'user-ana': {
      primary: {
        id: 'wallet-ana-primary',
        slot: 'primary',
        address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        network: 'ethereum',
        kind: 'metamask',
        label: 'Principal',
        sameAsPrimary: false,
        updatedAt: SEED_TIME,
      },
      secondary: null,
    },
    'user-bruno': {
      primary: {
        id: 'wallet-bruno-primary',
        slot: 'primary',
        address: '0x9b3a54d092f6b4b3d2ec676cd589f124e9921e71',
        network: 'polygon',
        kind: 'coinbase',
        label: 'Coinbase',
        sameAsPrimary: false,
        updatedAt: SEED_TIME,
      },
      secondary: {
        id: 'wallet-bruno-secondary',
        slot: 'secondary',
        address: '0x5aeda56215b167893e80b4fe645ba6d5bab767de',
        network: 'ethereum',
        kind: 'walletconnect',
        label: 'Reserva',
        sameAsPrimary: false,
        updatedAt: SEED_TIME,
      },
    },
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    users,
    sessions: [],
    nfts: buildCatalog(),
    favorites: {
      'user-ana': ['emerald-ape-042', 'neon-vessel-552'],
      'user-bruno': ['golden-beat-207'],
    },
    carts: [],
    coupons: COUPONS,
    quotes: [],
    orders: [],
    idempotency: [],
    wallets,
    walletConnections: [],
    networkFees: { ...DEFAULT_NETWORK_FEES },
  }
}

