import { z } from 'zod'
import { idSchema, isoDateSchema, moneySchema, quantitySchema } from './common'
import { networkSchema } from './nft'

/* ---------------------------------- Favorites ---------------------------------- */

export const favoritesResponseSchema = z.object({ nftIds: z.array(idSchema) })
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

export const quoteIssueSchema = z.object({
  type: z.enum(['PRICE_CHANGED', 'AVAILABILITY_CHANGED', 'SOLD_OUT']),
  itemId: idSchema,
  previous: z.string(),
  current: z.string(),
})
export type QuoteIssue = z.infer<typeof quoteIssueSchema>

export const quoteLineSchema = z.object({
  itemId: idSchema,
  nftId: idSchema,
  editionId: idSchema,
  name: z.string(),
  editionLabel: z.string(),
  unitPrice: moneySchema,
  quantity: quantitySchema,
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
  createdAt: isoDateSchema,
})
export type Quote = z.infer<typeof quoteSchema>

export const quoteInputSchema = z.object({ network: networkSchema.optional() })

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

export const walletConnectInputSchema = z.object({ network: networkSchema })
export const walletConnectResponseSchema = z.object({ status: z.literal('connected') })

/* ------------------------------------ Orders ----------------------------------- */

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'declined'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const buyerSchema = z.object({
  fullName: z
    .string({ error: 'Informe seu nome completo' })
    .trim()
    .min(3, { error: 'Informe seu nome completo' })
    .max(80, { error: 'Use no máximo 80 caracteres' }),
  email: z.string().trim().pipe(z.email({ error: 'Informe um e-mail válido' })),
})

export const createOrderInputSchema = z.object({
  quoteId: idSchema,
  walletId: idSchema,
  network: networkSchema,
  buyer: buyerSchema,
})
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>

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
  buyer: buyerSchema,
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

export const activeOrderResponseSchema = orderSchema.nullable()
