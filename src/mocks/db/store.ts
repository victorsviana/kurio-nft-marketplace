import { createSeed, SCHEMA_VERSION } from './fixtures'
import type { DbState } from './types'

/**
 * Persistence of the simulated backend. The whole database lives in memory and is written to
 * localStorage after every mutation, so it survives refresh (MOCK-02). The key is versioned:
 * a schema change discards old data instead of reading an incompatible shape. Reset rebuilds
 * the deterministic seed (MOCK-03).
 */

export const DB_STORAGE_KEY = `kurio.mockdb.v${SCHEMA_VERSION}`

let state: DbState | null = null

function readStorage(): DbState | null {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DbState
    return parsed.schemaVersion === SCHEMA_VERSION ? parsed : null
  } catch {
    return null
  }
}

function persist() {
  if (!state) return
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('[mocks] could not persist the simulated database', error)
  }
}

export async function initDb(): Promise<void> {
  state = readStorage()
  if (!state) {
    state = await createSeed()
    persist()
  }
  // Another tab changed the database: adopt its state (keeps tabs consistent).
  window.addEventListener('storage', (event) => {
    if (event.key !== DB_STORAGE_KEY) return
    state = readStorage() ?? state
  })
}

/** Read-only access. Callers must not mutate the returned object (use `mutate`). */
export function db(): Readonly<DbState> {
  if (!state) throw new Error('[mocks] database not initialized')
  return state
}

/** Applies a mutation and persists it. Returns whatever the mutator returns. */
export function mutate<T>(mutator: (draft: DbState) => T): T {
  if (!state) throw new Error('[mocks] database not initialized')
  const result = mutator(state)
  persist()
  return result
}

export async function resetDb(): Promise<void> {
  state = await createSeed()
  persist()
}
