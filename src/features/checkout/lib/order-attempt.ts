import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { activeOrderQuery } from '@/shared/api/endpoints/account'
import { ApiError, toApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/query-keys'
import { apiRequest } from '@/shared/api/request'
import { orderSchema, quoteSchema, type CreateOrderInput, type Order, type Quote } from '@/shared/contracts'

/**
 * Order submission without duplicates (CHK-06, ORD-06).
 *
 * An *attempt* is one confirmed review: a body (quote, wallet, network, buyer) and the
 * Idempotency-Key generated for it. The key is persisted per user BEFORE the first request, so:
 * - repeated clicks reuse the same key (and a ref guard drops clicks while one is in flight);
 * - a timeout is retried once with the same key, and the server answers with the order it
 *   already created instead of a new one;
 * - if the retry also fails, `GET /orders/active` is checked before giving the form back;
 * - a reload in the middle keeps the key, so the next click is still the same attempt.
 * A different body (new quote after a price change, another wallet) is a new attempt with a new
 * key; reusing the old key with it would be a 409 IDEMPOTENCY_CONFLICT on the server.
 */

/** Shorter than the global 10s: the `order-timeout` scenario answers after 6s. */
export const ORDER_TIMEOUT_MS = 4_000

interface StoredAttempt {
  key: string
  fingerprint: string
  createdAt: string
}

const storageKey = (userId: string) => `kurio.checkout.attempt.${userId}`

function load(userId: string): StoredAttempt | null {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    return raw ? (JSON.parse(raw) as StoredAttempt) : null
  } catch {
    return null
  }
}

function save(userId: string, attempt: StoredAttempt) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(attempt))
  } catch {
    /* memory-only: the in-flight guard still prevents duplicates in this page */
  }
}

/** Forgets the attempt once its order is terminal (or its body can no longer be sent). */
export function clearOrderAttempt(userId: string) {
  try {
    localStorage.removeItem(storageKey(userId))
  } catch {
    /* ignore */
  }
}

/** Same normalization as the server: key order never changes the fingerprint. */
function fingerprint(value: unknown): string {
  const normalize = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(normalize)
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.keys(v as Record<string, unknown>)
          .sort()
          .map((k) => [k, normalize((v as Record<string, unknown>)[k])]),
      )
    }
    return v
  }
  return JSON.stringify(normalize(value))
}

export type SubmitResult =
  | { kind: 'created'; order: Order; recovered: boolean }
  | { kind: 'stale'; quote: Quote; message: string }
  | { kind: 'in-progress'; orderId: string; message: string }
  | { kind: 'error'; error: ApiError }

const isTransient = (error: ApiError) => error.code === 'TIMEOUT' || error.code === 'NETWORK_ERROR' || error.status >= 500

function post(input: CreateOrderInput, key: string) {
  return apiRequest(orderSchema, {
    method: 'POST',
    url: '/orders',
    data: input,
    headers: { 'Idempotency-Key': key },
    timeout: ORDER_TIMEOUT_MS,
  })
}

export type AttemptPhase = 'idle' | 'submitting' | 'verifying'

export function useOrderAttempt(userId: string) {
  const queryClient = useQueryClient()
  const inFlight = useRef(false)
  const [phase, setPhase] = useState<AttemptPhase>('idle')

  const submit = useCallback(
    async (input: CreateOrderInput): Promise<SubmitResult | null> => {
      if (inFlight.current) return null // double click while the first request is running
      inFlight.current = true
      setPhase('submitting')
      try {
        const print = fingerprint(input)
        let attempt = load(userId)
        if (!attempt || attempt.fingerprint !== print) {
          attempt = { key: crypto.randomUUID(), fingerprint: print, createdAt: new Date().toISOString() }
          save(userId, attempt)
        }

        const created = (order: Order, recovered: boolean): SubmitResult => {
          queryClient.setQueryData(queryKeys.me.order(userId, order.id), order)
          return { kind: 'created', order, recovered }
        }

        let error: ApiError
        try {
          return created(await post(input, attempt.key), false)
        } catch (first) {
          error = toApiError(first)
        }

        if (isTransient(error)) {
          // Same key: the server returns the order it may already have created.
          setPhase('verifying')
          try {
            return created(await post(input, attempt.key), true)
          } catch (second) {
            error = toApiError(second)
          }
          if (isTransient(error)) {
            try {
              const active = await queryClient.fetchQuery({ ...activeOrderQuery(userId), staleTime: 0 })
              if (active) return created(active, true)
            } catch {
              /* still offline: keep the key and let the user retry */
            }
            return { kind: 'error', error }
          }
        }

        if (error.code === 'QUOTE_STALE') {
          clearOrderAttempt(userId)
          const quote = quoteSchema.safeParse(error.details.quote)
          if (quote.success) return { kind: 'stale', quote: quote.data, message: error.message }
          return { kind: 'error', error }
        }
        if (error.code === 'ORDER_IN_PROGRESS' && typeof error.details.orderId === 'string') {
          return { kind: 'in-progress', orderId: error.details.orderId, message: error.message }
        }
        if (error.code === 'IDEMPOTENCY_CONFLICT') clearOrderAttempt(userId)
        return { kind: 'error', error }
      } finally {
        inFlight.current = false
        setPhase('idle')
      }
    },
    [queryClient, userId],
  )

  return { submit, phase, busy: phase !== 'idle' }
}
