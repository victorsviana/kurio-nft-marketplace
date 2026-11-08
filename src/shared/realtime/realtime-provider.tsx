import { useQueryClient } from '@tanstack/react-query'
import { createContext, use, useEffect, useEffectEvent, useState, type ReactNode } from 'react'
import type { RealtimeEvent, RealtimeEventType } from '@/shared/contracts'
import { useStoredSession } from '@/shared/session/session-store'
import { registerCacheSync } from './cache-sync'
import { RealtimeClient, type RealtimeStatus } from './realtime-client'

const RealtimeContext = createContext<RealtimeClient | null>(null)

/**
 * Owns the realtime connection of the current session. When the token changes (login,
 * logout, user switch, expiry) the previous client is closed and a new one is created with
 * the new handshake token (RT-07, RT-08).
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const session = useStoredSession()
  const token = session?.token ?? null
  const userId = session?.userId ?? null
  const queryClient = useQueryClient()
  const [client, setClient] = useState<RealtimeClient | null>(null)

  useEffect(() => {
    const next = new RealtimeClient(token)
    const unregister = registerCacheSync(next, queryClient, userId)
    setClient(next)
    return () => {
      unregister()
      next.close()
    }
  }, [token, userId, queryClient])

  return <RealtimeContext value={client}>{children}</RealtimeContext>
}

/** Subscribes a component to an event type for its lifetime (e.g. to announce changes). */
export function useRealtimeEvent<T extends RealtimeEventType>(
  type: T,
  handler: (event: Extract<RealtimeEvent, { type: T }>) => void,
) {
  const client = use(RealtimeContext)
  const onEvent = useEffectEvent(handler)
  useEffect(() => {
    if (!client) return
    return client.on(type, (event) => onEvent(event))
  }, [client, type])
}

export function useRealtimeStatus(): RealtimeStatus {
  const client = use(RealtimeContext)
  const [status, setStatus] = useState<RealtimeStatus>(client?.status ?? 'connecting')
  useEffect(() => {
    if (!client) return
    setStatus(client.status)
    return client.onStatus(setStatus)
  }, [client])
  return status
}
