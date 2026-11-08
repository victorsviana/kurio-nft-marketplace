import type { AxiosRequestConfig } from 'axios'
import type { z } from 'zod'
import { parseOrThrow } from '@/shared/contracts'
import { toApiError } from './errors'
import { http } from './http'

/**
 * Typed REST call: performs the request through the Axios instance and validates the body
 * against the zod contract at the boundary (constitution §2.3). A drift becomes an
 * `ApiError` with code CONTRACT_ERROR instead of leaking malformed data into the UI.
 */
export async function apiRequest<S extends z.ZodType>(schema: S, request: AxiosRequestConfig): Promise<z.output<S>> {
  const response = await http.request<unknown>(request)
  try {
    return parseOrThrow(schema, response.data, `${(request.method ?? 'GET').toUpperCase()} ${request.url}`)
  } catch (error) {
    if (import.meta.env.DEV) console.error(error)
    throw toApiError(error)
  }
}

/** For endpoints that answer 204 No Content. */
export async function apiRequestVoid(request: AxiosRequestConfig): Promise<void> {
  await http.request(request)
}
