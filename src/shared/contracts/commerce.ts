import { z } from 'zod'
import { displayNameField, emailField, usernameField } from './auth'
import { idSchema, isoDateSchema, moneySchema, quantitySchema } from './common'
import { networkSchema, nftSummarySchema } from './nft'

/* ---------------------------------- Favorites ---------------------------------- */

/** `items` carries the summaries so the favorites page renders without N detail requests. */
export const favoritesResponseSchema = z.object({ nftIds: z.array(idSchema), items: z.array(nftSummarySchema) })
export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>

/* ------------------------------------ Cart ------------------------------------- */

export const cartItemSchema = z.object({
  id: idSchema,
  nftId: idSchema,
  editionId: idSchema,
  name: z.string(),
  image: z.string(),
  tokenId: z.string(),
  editionLabel: z.string(),
  unitPrice: moneySchema,
  quantity: quantitySchema,
  /** Units of this edition currently available (the cart quantity can never exceed it). */
  available: z.number().int().nonnegative(),
  lineTotal: moneySchema,
})
export type CartItem = z.infer<typeof cartItemSchema>

export const cartSchema = z.object({
  id: idSchema,
  items: z.array(cartItemSchema),
  couponCode: z.string().nullable(),
  version: z.number().int().nonnegative(),
})
export type Cart = z.infer<typeof cartSchema>

export const addCartItemInputSchema = z.object({
  nftId: idSchema,
  editionId: idSchema,
  quantity: quantitySchema,
})
export type AddCartItemInput = z.infer<typeof addCartItemInputSchema>

export const updateCartItemInputSchema = z.object({ quantity: quantitySchema })
export const couponInputSchema = z.object({
  code: z.string().trim().min(1, { error: 'Informe um cupom' }).max(32).toUpperCase(),
})
export const mergeCartInputSchema = z.object({ guestCartId: z.uuid() })

/* ------------------------------------ Quote ------------------------------------ */

/**
 * Difference between a quote and the one the client reviewed (`previousQuoteId`) or between
 * the cart and the stock. `itemId` is null for quote-wide changes (coupon, network fee).
 */
export const quoteIssueSchema = z.object({
  type: z.enum(['PRICE_CHANGED', 'AVAILABILITY_CHANGED', 'SOLD_OUT', 'ITEM_REMOVED', 'COUPON_CHANGED', 'FEE_CHANGED']),
  itemId: idSchema.nullable(),
  /** Human label of the affected line or field ("Emerald Ape #042 · 1/50", "Cupom KURIO10"). */
  label: z.string(),
  previous: z.string(),
  current: z.string(),
})
export type QuoteIssue = z.infer<typeof quoteIssueSchema>

export const quoteLineSchema = z.object({
  itemId: idSchema,
  nftId: idSchema,
  editionId: idSchema,
  name: z.string(),
  image: z.string(),
  tokenId: z.string(),
  editionLabel: z.string(),
  unitPrice: moneySchema,
  quantity: quantitySchema,
  /** Units available when the quote was computed; `quantity > available` blocks the order. */
  available: z.number().int().nonnegative(),
  lineTotal: moneySchema,
})
export type QuoteLine = z.infer<typeof quoteLineSchema>

export const quoteSchema = z.object({
  id: idSchema,
  cartVersion: z.number().int().nonnegative(),
  items: z.array(quoteLineSchema),
  subtotal: moneySchema,
  discount: moneySchema,
  networkFee: moneySchema,
  total: moneySchema,
  coupon: z.object({ code: z.string(), status: z.enum(['applied', 'invalid', 'expired']) }).nullable(),
  network: networkSchema,
  issues: z.array(quoteIssueSchema),
  /** False when a line exceeds the stock or is sold out: the order would be refused. */
  purchasable: z.boolean(),
  createdAt: isoDateSchema,
})
export type Quote = z.infer<typeof quoteSchema>

export const quoteInputSchema = z.object({
  network: networkSchema.optional(),
  /** Quote the user reviewed; the response lists what changed since it (CHK-05). */
  previousQuoteId: idSchema.optional(),
})
export type QuoteInput = z.infer<typeof quoteInputSchema>

/* ----------------------------------- Wallets ----------------------------------- */

export const walletSlotSchema = z.enum(['primary', 'secondary'])
export type WalletSlot = z.infer<typeof walletSlotSchema>
export const walletKindSchema = z.enum(['metamask', 'walletconnect', 'coinbase'])
export type WalletKind = z.infer<typeof walletKindSchema>
export const WALLET_KIND_LABELS: Record<WalletKind, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

export const walletAddressField = z
  .string({ error: 'Informe o endereço da carteira' })
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, { error: 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais' })

export const walletSchema = z.object({
  id: idSchema,
  slot: walletSlotSchema,
  address: z.string(),
  network: networkSchema,
  kind: walletKindSchema,
  label: z.string(),
  sameAsPrimary: z.boolean(),
  updatedAt: isoDateSchema,
})
export type Wallet = z.infer<typeof walletSchema>

export const walletsResponseSchema = z.object({
  primary: walletSchema.nullable(),
  secondary: walletSchema.nullable(),
})
export type WalletsResponse = z.infer<typeof walletsResponseSchema>

export const walletInputSchema = z.object({
  address: walletAddressField,
  network: networkSchema,
  kind: walletKindSchema,
  label: z.string().trim().max(32, { error: 'Use no máximo 32 caracteres' }).default(''),
  sameAsPrimary: z.boolean().default(false),
})
export type WalletInput = z.input<typeof walletInputSchema>

export const walletConnectInputSchema = z.object({ network: networkSchema, kind: walletKindSchema })
export const walletConnectResponseSchema = z.object({ status: z.literal('connected') })

/* ------------------------------------ Orders ----------------------------------- */

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'declined'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

/**
 * Collector data of the payment form (Figma "Perfil do colecionador"). The same schema
 * validates the form and the POST /orders body (CHK-02); the server maps failures back to
 * these field names in `fieldErrors`.
 */
export const buyerSchema = z.object({
  displayName: displayNameField,
  username: usernameField,
  /** "Nome do perfil": the ENS label, combined with `ensSuffix` (".eth"). */
  profileName: z
    .string({ error: 'Informe o nome do perfil' })
    .trim()
    .min(3, { error: 'O nome do perfil precisa ter pelo menos 3 caracteres' })
    .max(32, { error: 'Use no máximo 32 caracteres' })
    .regex(/^[a-z0-9-]+$/, { error: 'Use letras minúsculas, números ou hífen' }),
  ensSuffix: z.literal('.eth', { error: 'Selecione o sufixo ENS' }),
  email: emailField,
  walletAddress: walletAddressField,
  walletKind: walletKindSchema,
  /** "ENS ou carteira secundária (opcional)". */
  secondaryReference: z
    .string()
    .trim()
    .max(64, { error: 'Use no máximo 64 caracteres' })
    .refine((v) => v === '' || /^0x[a-fA-F0-9]{40}$/.test(v) || /^[a-z0-9-]+\.eth$/.test(v), {
      error: 'Use um endereço 0x ou um nome ENS (nome.eth)',
    })
    .default(''),
  referralCode: z
    .string()
    .trim()
    .max(16, { error: 'Use no máximo 16 caracteres' })
    .refine((v) => v === '' || /^[A-Za-z0-9]{4,16}$/.test(v), { error: 'Use de 4 a 16 letras ou números' })
    .default(''),
  note: z.string().trim().max(280, { error: 'Use no máximo 280 caracteres' }).default(''),
})
export type Buyer = z.output<typeof buyerSchema>
export type BuyerInput = z.input<typeof buyerSchema>

export const createOrderInputSchema = z.object({
  quoteId: idSchema,
  walletId: idSchema,
  network: networkSchema,
  buyer: buyerSchema,
})
export type CreateOrderInput = z.input<typeof createOrderInputSchema>

export const orderSchema = z.object({
  id: idSchema,
  status: orderStatusSchema,
  txHash: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  createdAt: isoDateSchema,
  confirmedAt: isoDateSchema.nullable(),
  declineReason: z.string().nullable(),
  wallet: z.object({ id: idSchema, address: z.string(), kind: walletKindSchema, label: z.string() }),
  network: networkSchema,
  buyer: z.object({ displayName: z.string(), email: z.string(), username: z.string() }),
  /** Immutable snapshot of the purchased lines (ORD-05). */
  items: z.array(quoteLineSchema),
  subtotal: moneySchema,
  discount: moneySchema,
  networkFee: moneySchema,
  total: moneySchema,
  couponCode: z.string().nullable(),
  version: z.number().int().nonnegative(),
})
export type Order = z.infer<typeof orderSchema>

export const activeOrderResponseSchema = z.object({ order: orderSchema.nullable() })
