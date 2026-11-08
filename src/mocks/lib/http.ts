import { HttpResponse } from 'msw'
import type { z } from 'zod'
import { type ErrorCode, toFieldErrors } from '@/shared/contracts'
import { config } from '@/shared/config'

/** Absolute API route pattern for MSW (`/api/...`). */
export const api = (path: string) => `${config.apiBaseUrl}${path}`

/** Path of a request relative to the API base ("/nfts/abc"). */
export function apiPathOf(request: Request): string {
  const { pathname } = new URL(request.url)
  return pathname.startsWith(config.apiBaseUrl) ? pathname.slice(config.apiBaseUrl.length) || '/' : pathname
}

export function apiError(
  status: number,
  code: ErrorCode,
  message: string,
  extra: { fieldErrors?: Record<string, string>; details?: Record<string, unknown> } = {},
) {
  return HttpResponse.json({ error: { code, message, ...extra } }, { status })
}

export type BodyResult<T> = { ok: true; data: T } | { ok: false; response: Response }

/** Parses and validates a JSON body with the shared contract (server-side validation). */
export async function readBody<S extends z.ZodType>(request: Request, schema: S): Promise<BodyResult<z.output<S>>> {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return { ok: false, response: apiError(400, 'BAD_REQUEST', 'Corpo da requisição inválido.') }
  }
  const result = schema.safeParse(json)
  if (!result.success) {
    return {
      ok: false,
      response: apiError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', {
        fieldErrors: toFieldErrors(result.error),
      }),
    }
  }
  return { ok: true, data: result.data }
}

export const nowIso = () => new Date().toISOString()
