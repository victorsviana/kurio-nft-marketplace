import { isAxiosError, isCancel } from 'axios'
import { apiErrorBodySchema, ContractError, type ErrorCode } from '@/shared/contracts'

export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'CANCELED' | 'CONTRACT_ERROR' | 'UNKNOWN'

/**
 * Normalized error for every REST failure. Components and hooks only ever see this type,
 * never raw Axios errors (T2.4).
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: ClientErrorCode
  readonly fieldErrors: Record<string, string>
  readonly details: Record<string, unknown>

  constructor(init: {
    status: number
    code: ClientErrorCode
    message: string
    fieldErrors?: Record<string, string>
    details?: Record<string, unknown>
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.fieldErrors = init.fieldErrors ?? {}
    this.details = init.details ?? {}
  }

  /** Transient failures that a retry may fix: offline, timeout, 5xx. 4xx never retries. */
  get isRetryable(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT' || this.status >= 500
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof ContractError) {
    return new ApiError({ status: 0, code: 'CONTRACT_ERROR', message: 'Resposta inesperada do servidor.' })
  }
  if (isCancel(error)) return new ApiError({ status: 0, code: 'CANCELED', message: 'Requisição cancelada.' })
  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ status: 0, code: 'TIMEOUT', message: 'O servidor demorou para responder.' })
    }
    if (!error.response) {
      return new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Sem conexão com o servidor.' })
    }
    const body = apiErrorBodySchema.safeParse(error.response.data)
    if (body.success) {
      return new ApiError({ status: error.response.status, ...body.data.error })
    }
    return new ApiError({ status: error.response.status, code: 'UNKNOWN', message: 'Erro inesperado no servidor.' })
  }
  return new ApiError({ status: 0, code: 'UNKNOWN', message: error instanceof Error ? error.message : 'Erro inesperado.' })
}

/** Human message for an error, suitable for toasts and inline alerts. */
export function errorMessage(error: unknown): string {
  return toApiError(error).message
}
