import type { AuthResponse, User } from '@/shared/contracts'
import { db, mutate } from '../db/store'
import type { SessionRecord, UserRecord } from '../db/types'
import { apiError, nowIso } from '../lib/http'

/** Session lifetime in the simulation. Expiry can also be forced with the control API. */
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000

export function toUserDto(user: UserRecord): User {
  return {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
  }
}

export function createSession(userId: string): SessionRecord {
  const session: SessionRecord = {
    token: `kurio_${crypto.randomUUID().replace(/-/g, '')}`,
    userId,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    revoked: false,
  }
  mutate((draft) => {
    // keep the table small: drop dead sessions
    draft.sessions = draft.sessions.filter((s) => !s.revoked && Date.parse(s.expiresAt) > Date.now())
    draft.sessions.push(session)
  })
  return session
}

export function authResponse(user: UserRecord, session: SessionRecord): AuthResponse {
  return { user: toUserDto(user), session: { token: session.token, expiresAt: session.expiresAt } }
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim() || null
}

type SessionLookup =
  | { status: 'valid'; session: SessionRecord; user: UserRecord }
  | { status: 'expired' }
  | { status: 'missing' }

export function lookupSession(token: string | null): SessionLookup {
  if (!token) return { status: 'missing' }
  const session = db().sessions.find((s) => s.token === token)
  if (!session) return { status: 'missing' }
  if (session.revoked || Date.parse(session.expiresAt) <= Date.now()) return { status: 'expired' }
  const user = db().users.find((u) => u.id === session.userId)
  if (!user) return { status: 'missing' }
  return { status: 'valid', session, user }
}

export type AuthResult = { ok: true; user: UserRecord; session: SessionRecord } | { ok: false; response: Response }

/** Guards a private route: 401 UNAUTHENTICATED without a session, SESSION_EXPIRED when stale. */
export function requireAuth(request: Request): AuthResult {
  const lookup = lookupSession(bearerToken(request))
  if (lookup.status === 'valid') return { ok: true, user: lookup.user, session: lookup.session }
  if (lookup.status === 'expired') {
    return { ok: false, response: apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.') }
  }
  return { ok: false, response: apiError(401, 'UNAUTHENTICATED', 'Entre para continuar.') }
}

/**
 * Optional auth for routes open to visitors (cart). A stale token is still an error, so the
 * client learns about expiry instead of silently switching to a guest cart.
 */
export function optionalAuth(request: Request): AuthResult | { ok: true; user: null; session: null } {
  const token = bearerToken(request)
  if (!token) return { ok: true, user: null, session: null }
  return requireAuth(request)
}

/** Used by the Socket.IO hub to route private events to the owner of the handshake token. */
export function resolveTokenUser(token: string | null): string | null {
  const lookup = lookupSession(token)
  return lookup.status === 'valid' ? lookup.user.id : null
}

export function revokeSession(token: string) {
  mutate((draft) => {
    const session = draft.sessions.find((s) => s.token === token)
    if (session) session.revoked = true
  })
}

/** Control action: every active session expires (AUTH-04 scenario). */
export function expireAllSessions() {
  mutate((draft) => {
    for (const session of draft.sessions) session.expiresAt = new Date(Date.now() - 1000).toISOString()
  })
}
