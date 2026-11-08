import { z } from 'zod'

/**
 * Shared primitives for every contract. Money travels as a decimal string in ETH and is
 * computed with big.js (constitution §3); it is never a JS number.
 */
export const moneySchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, { error: 'Valor monetário inválido' })
export type Money = z.infer<typeof moneySchema>

export const isoDateSchema = z.iso.datetime({ offset: true })
export const idSchema = z.string().min(1)
export const quantitySchema = z.number().int().positive()

export const errorCodeSchema = z.enum([
  'BAD_REQUEST',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'INVALID_CREDENTIALS',
  'FORBIDDEN',
  'NOT_FOUND',
  'EMAIL_TAKEN',
  'USERNAME_TAKEN',
  'INSUFFICIENT_AVAILABILITY',
  'QUOTE_STALE',
  'IDEMPOTENCY_CONFLICT',
  'VALIDATION_ERROR',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'WRONG_PASSWORD',
  'WALLET_REJECTED',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
])
export type ErrorCode = z.infer<typeof errorCodeSchema>

/** Standard error envelope returned by every non-2xx response. */
export const apiErrorBodySchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    fieldErrors: z.record(z.string(), z.string()).optional(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>

export class ContractError extends Error {
  readonly issues: z.core.$ZodIssue[]
  constructor(context: string, issues: z.core.$ZodIssue[]) {
    super(`Resposta fora do contrato (${context}): ${issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
    this.name = 'ContractError'
    this.issues = issues
  }
}

/** Validates data at a boundary (Axios responses, MSW request bodies) and throws on drift. */
export function parseOrThrow<S extends z.ZodType>(schema: S, data: unknown, context = 'payload'): z.output<S> {
  const result = schema.safeParse(data)
  if (!result.success) throw new ContractError(context, result.error.issues)
  return result.data
}

/** Maps zod issues to `{ field: message }`, the same shape the API uses in `fieldErrors`. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    fieldErrors[key] ??= issue.message
  }
  return fieldErrors
}
