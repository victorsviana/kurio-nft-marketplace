/** SHA-256(salt + password) as hex. Used only by the simulated backend. */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomSalt(): string {
  return [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Stable fingerprint of a JSON body (key order independent), used for idempotency checks. */
export function fingerprint(value: unknown): string {
  const canonical = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(canonical)
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.keys(v as Record<string, unknown>)
          .sort()
          .map((k) => [k, canonical((v as Record<string, unknown>)[k])]),
      )
    }
    return v
  }
  return JSON.stringify(canonical(value))
}

export function randomHex(length: number): string {
  return [...crypto.getRandomValues(new Uint8Array(Math.ceil(length / 2)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length)
}
