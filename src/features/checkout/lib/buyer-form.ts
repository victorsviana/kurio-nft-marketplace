import type { z } from 'zod'
import {
  buyerSchema,
  networkSchema,
  toFieldErrors,
  walletKindSchema,
  type Buyer,
  type Network,
  type Profile,
  type Wallet,
  type WalletKind,
  type WalletSlot,
  type WalletsResponse,
} from '@/shared/contracts'

/**
 * Collector form of the payment screen (CHK-02, WAL-03). The values are validated with the same
 * `buyerSchema` the server uses for POST /orders, so client and server always agree; only the
 * "required" wording for empty fields is form-specific (the schema would say "at least N
 * characters" for an empty string).
 */

/** Fields in visual order (desktop grid, row by row): the first invalid one receives focus. */
export const BUYER_FIELDS = [
  'displayName',
  'username',
  'profileName',
  'walletAddress',
  'secondaryReference',
  'walletKind',
  'referralCode',
  'email',
  'ensSuffix',
  'note',
] as const satisfies readonly (keyof Buyer)[]
export type BuyerField = (typeof BUYER_FIELDS)[number]

/** Form-only field: the network is part of the order, not of the buyer. */
export type FormField = BuyerField | 'network'
export const FORM_FIELDS: readonly FormField[] = [
  'displayName',
  'username',
  'network',
  'profileName',
  'walletAddress',
  'secondaryReference',
  'walletKind',
  'referralCode',
  'email',
  'ensSuffix',
  'note',
]

export type BuyerValues = Record<BuyerField, string>
export type FieldErrors = Partial<Record<FormField, string>>

export interface CheckoutFormState {
  values: BuyerValues
  network: Network | ''
  slot: WalletSlot
}

const REQUIRED: Partial<Record<FormField, string>> = {
  displayName: 'Informe o nome de exibição',
  username: 'Informe o nome de usuário',
  profileName: 'Informe o nome do perfil',
  walletAddress: 'Informe o endereço da carteira',
  walletKind: 'Selecione o tipo de carteira',
  email: 'Informe o e-mail',
  ensSuffix: 'Selecione o sufixo ENS',
  network: 'Selecione uma rede',
}

function firstIssue(schema: z.ZodType, value: string): string | undefined {
  const result = schema.safeParse(value)
  return result.success ? undefined : result.error.issues[0]?.message
}

export function validateField(field: FormField, state: CheckoutFormState): string | undefined {
  if (field === 'network') return state.network ? undefined : REQUIRED.network
  const value = state.values[field]
  if (value.trim() === '' && REQUIRED[field]) return REQUIRED[field]
  return firstIssue(buyerSchema.shape[field], value)
}

export type ParseResult = { ok: true; buyer: Buyer; network: Network } | { ok: false; errors: FieldErrors }

export function parseCheckoutForm(state: CheckoutFormState): ParseResult {
  const errors: FieldErrors = {}
  for (const field of FORM_FIELDS) {
    const message = validateField(field, state)
    if (message) errors[field] = message
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  const result = buyerSchema.safeParse(state.values)
  if (!result.success) return { ok: false, errors: pickFormErrors(toFieldErrors(result.error)) }
  return { ok: true, buyer: result.data, network: state.network as Network }
}

/** Maps API `fieldErrors` (`buyer.walletAddress`, `network`) onto the form fields. */
export function pickFormErrors(source: Record<string, string>): FieldErrors {
  const picked: FieldErrors = {}
  for (const [key, message] of Object.entries(source)) {
    const field = key.replace(/^buyer\./, '') as FormField
    if ((FORM_FIELDS as readonly string[]).includes(field)) picked[field] ??= message
  }
  return picked
}

export const firstInvalid = (errors: FieldErrors) => FORM_FIELDS.find((field) => errors[field])

/* --------------------------------- prefill --------------------------------- */

export function walletOf(wallets: WalletsResponse, slot: WalletSlot): Wallet | null {
  return slot === 'secondary' ? wallets.secondary : wallets.primary
}

/** WAL-03: profile + the primary wallet (or the secondary one when it is the only one). */
export function prefill(profile: Profile, wallets: WalletsResponse): CheckoutFormState {
  const slot: WalletSlot = wallets.primary ? 'primary' : 'secondary'
  const wallet = walletOf(wallets, slot)
  return {
    slot,
    network: wallet?.network ?? '',
    values: {
      displayName: profile.displayName,
      username: profile.username,
      profileName: profile.ensName.replace(/\.eth$/, ''),
      ensSuffix: '.eth',
      email: profile.email,
      walletAddress: wallet?.address ?? '',
      walletKind: wallet?.kind ?? '',
      secondaryReference: '',
      referralCode: '',
      note: '',
    },
  }
}

/** Switching the wallet slot brings its address, kind and network into the form. */
export function withWallet(state: CheckoutFormState, wallets: WalletsResponse, slot: WalletSlot): CheckoutFormState {
  const wallet = walletOf(wallets, slot)
  if (!wallet) return state
  return {
    slot,
    network: wallet.network,
    values: { ...state.values, walletAddress: wallet.address, walletKind: wallet.kind },
  }
}

export const isWalletKind = (value: string): value is WalletKind => walletKindSchema.safeParse(value).success

/* ---------------------------------- draft ---------------------------------- */

/**
 * AUTH-04: what the user typed survives an expired session (login → back to /checkout). Kept in
 * sessionStorage (this tab only) per user; it holds only the collector form, never the session,
 * the connection state or the reviewed quote.
 */
const draftKey = (userId: string) => `kurio.checkout.draft.${userId}`

export function loadDraft(userId: string, wallets: WalletsResponse): CheckoutFormState | null {
  try {
    const raw = sessionStorage.getItem(draftKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CheckoutFormState>
    if (!parsed.values || typeof parsed.values !== 'object') return null
    const values = {} as BuyerValues
    for (const field of BUYER_FIELDS) {
      const value = (parsed.values as Record<string, unknown>)[field]
      values[field] = typeof value === 'string' ? value : ''
    }
    const slot: WalletSlot = parsed.slot === 'secondary' && wallets.secondary ? 'secondary' : wallets.primary ? 'primary' : 'secondary'
    const network = networkSchema.safeParse(parsed.network)
    return { slot, network: network.success ? network.data : '', values }
  } catch {
    return null
  }
}

export function saveDraft(userId: string, state: CheckoutFormState) {
  try {
    sessionStorage.setItem(draftKey(userId), JSON.stringify(state))
  } catch {
    /* storage unavailable: the form still works, it just is not restored */
  }
}

export function clearDraft(userId: string) {
  try {
    sessionStorage.removeItem(draftKey(userId))
  } catch {
    /* ignore */
  }
}
