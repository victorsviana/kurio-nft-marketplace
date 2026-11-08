import type { z } from 'zod'
import { toApiError, type ApiError } from '@/shared/api/errors'
import { loginInputSchema, registerInputSchema, toFieldErrors } from '@/shared/contracts'

/**
 * Client validation of the auth forms (AUTH-01, AUTH-02). Field rules come from the shared
 * contracts, the same schemas the mock server validates with, so client and server always
 * agree. Only "required" and the password confirmation are form-specific.
 */

export type Values<F extends string> = Record<F, string>
export type FieldErrors<F extends string> = Partial<Record<F, string>>
export type ParseResult<F extends string, P> = { ok: true; data: P } | { ok: false; errors: FieldErrors<F> }

function firstIssue(schema: z.ZodType, value: string): string | undefined {
  const result = schema.safeParse(value)
  return result.success ? undefined : result.error.issues[0]?.message
}

/** Runs every field validator; the whole-object schema then produces the normalized payload. */
function parseWith<F extends string, S extends z.ZodType>(
  fields: readonly F[],
  validateField: (field: F, values: Values<F>) => string | undefined,
  schema: S,
  values: Values<F>,
): ParseResult<F, z.output<S>> {
  const errors: FieldErrors<F> = {}
  for (const field of fields) {
    const message = validateField(field, values)
    if (message) errors[field] = message
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  const result = schema.safeParse(values)
  if (!result.success) return { ok: false, errors: pickFields(fields, toFieldErrors(result.error)) }
  return { ok: true, data: result.data }
}

function pickFields<F extends string>(fields: readonly F[], source: Record<string, string>): FieldErrors<F> {
  const picked: FieldErrors<F> = {}
  for (const field of fields) {
    if (source[field]) picked[field] = source[field]
  }
  return picked
}

/* ---------------------------------- login --------------------------------- */

export const LOGIN_FIELDS = ['email', 'password'] as const
export type LoginField = (typeof LOGIN_FIELDS)[number]
export type LoginPayload = z.output<typeof loginInputSchema>

export function validateLoginField(field: LoginField, values: Values<LoginField>): string | undefined {
  if (field === 'email') return firstIssue(loginInputSchema.shape.email, values.email)
  return firstIssue(loginInputSchema.shape.password, values.password)
}

export const parseLogin = (values: Values<LoginField>) => parseWith(LOGIN_FIELDS, validateLoginField, loginInputSchema, values)

/* --------------------------------- sign up -------------------------------- */

export const SIGNUP_FIELDS = ['username', 'email', 'password', 'confirmPassword'] as const
export type SignupField = (typeof SIGNUP_FIELDS)[number]
export type SignupPayload = z.output<typeof registerInputSchema>

const REQUIRED: Record<SignupField, string> = {
  username: 'Informe um nome de usuário',
  email: 'Informe seu e-mail',
  password: 'Informe uma senha',
  confirmPassword: 'Confirme sua senha',
}

export function validateSignupField(field: SignupField, values: Values<SignupField>): string | undefined {
  const value = values[field]
  if (value.trim() === '') return REQUIRED[field]
  switch (field) {
    case 'username':
      return firstIssue(registerInputSchema.shape.username, value)
    case 'email':
      return firstIssue(registerInputSchema.shape.email, value)
    case 'password':
      return firstIssue(registerInputSchema.shape.password, value)
    case 'confirmPassword':
      return value === values.password ? undefined : 'As senhas não coincidem'
  }
}

/**
 * The Figma form has no display name: the payload is `{ username, email, password }` (the
 * object schema strips `confirmPassword`, and the server defaults the display name).
 */
export function parseSignup(values: Values<SignupField>): ParseResult<SignupField, SignupPayload> {
  const result = parseWith(SIGNUP_FIELDS, validateSignupField, registerInputSchema, values)
  if (!result.ok) return result
  const { username, email, password } = result.data
  return { ok: true, data: { username, email, password } }
}

/* ------------------------------- API errors ------------------------------- */

/** Conflict codes that belong to one field even if the server sends no `fieldErrors`. */
const CODE_FIELD: Partial<Record<string, string>> = { EMAIL_TAKEN: 'email', USERNAME_TAKEN: 'username' }

export interface MappedAuthError<F extends string> {
  fieldErrors: FieldErrors<F>
  formError: string | null
}

/**
 * Maps an API failure onto the form: field errors (409 conflicts, 422 validation) go to the
 * matching inputs; everything else (401 invalid credentials, offline, 5xx) is a form-level alert.
 */
export function mapAuthError<F extends string>(error: unknown, fields: readonly F[]): MappedAuthError<F> {
  const apiError = toApiError(error)
  const fieldErrors = pickFields(fields, apiError.fieldErrors)
  const codeField = CODE_FIELD[apiError.code]
  if (Object.keys(fieldErrors).length === 0 && codeField && (fields as readonly string[]).includes(codeField)) {
    fieldErrors[codeField as F] = apiError.message
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, formError: null }
  return { fieldErrors: {}, formError: formErrorMessage(apiError) }
}

function formErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'E-mail ou senha incorretos. Confira os dados e tente novamente.'
    case 'NETWORK_ERROR':
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
    case 'TIMEOUT':
      return 'O servidor demorou para responder. Tente novamente.'
    case 'CONTRACT_ERROR':
      return 'Recebemos uma resposta inesperada do servidor. Tente novamente.'
  }
  if (error.status >= 500) return 'O serviço está indisponível no momento. Tente novamente em instantes.'
  return error.message || 'Não foi possível concluir. Tente novamente.'
}
