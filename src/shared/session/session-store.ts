import { useSyncExternalStore } from 'react'

/**
 * Client-side session: only the opaque token, its expiry and the owner id are persisted
 * (never the password). The user profile itself comes from `GET /auth/session` through
 * TanStack Query. Changes are broadcast to subscribers and to other tabs (storage event),
 * so logging out in one tab logs out every tab (AUTH-05).
 */

export interface StoredSession {
  token: string
  expiresAt: string
  userId: string
}

export type SessionEndReason = 'logout' | 'expired' | 'invalid'

export const SESSION_STORAGE_KEY = 'kurio.session'

function read(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredSession>
    return parsed.token && parsed.userId && parsed.expiresAt ? (parsed as StoredSession) : null
  } catch {
    return null
  }
}

function write(session: StoredSession | null) {
  try {
    if (session) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    /* storage unavailable: session lives in memory only */
  }
}

let current: StoredSession | null = read()
const listeners = new Set<() => void>()
const endListeners = new Set<(reason: SessionEndReason, previous: StoredSession) => void>()

function emit() {
  for (const listener of listeners) listener()
}

window.addEventListener('storage', (event) => {
  if (event.key !== SESSION_STORAGE_KEY) return
  const previous = current
  current = read()
  if (previous && previous.userId !== current?.userId) {
    for (const listener of endListeners) listener('logout', previous)
  }
  emit()
})

export const sessionStore = {
  get: (): StoredSession | null => current,
  getToken: (): string | null => current?.token ?? null,

  start(session: StoredSession) {
    const previous = current
    current = session
    write(session)
    if (previous && previous.userId !== session.userId) {
      for (const listener of endListeners) listener('logout', previous)
    }
    emit()
  },

  end(reason: SessionEndReason) {
    const previous = current
    if (!previous) return
    current = null
    write(null)
    for (const listener of endListeners) listener(reason, previous)
    emit()
  },

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  /** Fires when a session ends (logout, expiry, invalid token or user switch). */
  onEnd(listener: (reason: SessionEndReason, previous: StoredSession) => void) {
    endListeners.add(listener)
    return () => {
      endListeners.delete(listener)
    }
  },
}

export function useStoredSession(): StoredSession | null {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.get)
}
