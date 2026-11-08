import type {
  Attribute,
  Category,
  Edition,
  Network,
  Order,
  OrderStatus,
  QuoteIssue,
  QuoteLine,
  Rarity,
  Review,
  Wallet,
} from '@/shared/contracts'

/**
 * Shape of the simulated backend database. Every mock handler reads and writes this single
 * state, so catalog, favorites, cart, profile, wallets and orders stay consistent (MOCK-02).
 * It is persisted in localStorage under a versioned key (see store.ts).
 */

export interface UserRecord {
  id: string
  displayName: string
  username: string
  email: string
  ensName: string
  walletNickname: string
  avatarUrl: string | null
  /** SHA-256(salt + password), hex. Passwords are never stored in clear (constitution §3). */
  passwordHash: string
  salt: string
  createdAt: string
  updatedAt: string
}

export interface SessionRecord {
  token: string
  userId: string
  createdAt: string
  expiresAt: string
  /** Set by logout or by the "session expired" control. */
  revoked: boolean
}

export interface NftRecord {
  id: string
  name: string
  /** Artwork key; the image URL is derived from it. */
  art: string
  category: Category
  collection: string
  collectionSlug: string
  network: Network
  compareAtPrice: string | null
  isTrending: boolean
  rarity: Rarity
  createdAt: string
  version: number
  tokenId: string
  creator: string
  description: string
  longDescription: string[]
  rating: number
  reviewsCount: number
  reviews: Review[]
  attributes: Attribute[]
  contractAddress: string
  royaltyPercent: string
  defaultEditionId: string
  editions: Edition[]
}

export type CartOwner = { kind: 'user'; userId: string } | { kind: 'guest'; guestId: string }

export interface CartItemRecord {
  id: string
  nftId: string
  editionId: string
  quantity: number
  addedAt: string
}

export interface CartRecord {
  id: string
  owner: CartOwner
  items: CartItemRecord[]
  couponCode: string | null
  version: number
  updatedAt: string
}

export interface CouponRecord {
  code: string
  /** Percentage off the subtotal, as a decimal string ("10"). */
  percentOff: string
  expiresAt: string
}

export interface QuoteRecord {
  id: string
  cartId: string
  userId: string | null
  cartVersion: number
  network: Network
  items: QuoteLine[]
  subtotal: string
  discount: string
  networkFee: string
  total: string
  coupon: { code: string; status: 'applied' | 'invalid' | 'expired' } | null
  issues: QuoteIssue[]
  createdAt: string
}

export interface IdempotencyRecord {
  key: string
  userId: string
  /** Stable hash of the request body; same key + different body = 409 (ORD-06). */
  fingerprint: string
  orderId: string
  createdAt: string
}

export interface OrderRecord extends Order {
  userId: string
  quoteId: string
  /** Outcome decided at creation by the active scenario; applied when the order settles. */
  plannedOutcome: Exclude<OrderStatus, 'pending'>
  settleAt: string
}

export interface WalletPair {
  primary: Wallet | null
  secondary: Wallet | null
}

export interface DbState {
  schemaVersion: number
  users: UserRecord[]
  sessions: SessionRecord[]
  nfts: NftRecord[]
  /** userId → favorite NFT ids */
  favorites: Record<string, string[]>
  carts: CartRecord[]
  coupons: CouponRecord[]
  quotes: QuoteRecord[]
  orders: OrderRecord[]
  idempotency: IdempotencyRecord[]
  /** userId → wallets */
  wallets: Record<string, WalletPair>
}
