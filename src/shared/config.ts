/**
 * Runtime configuration read from Vite env variables (see `.env` and README).
 * Nothing here knows about mocks beyond the flag that turns the MSW layer on.
 */
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.kurio.mock',
  mocksEnabled: import.meta.env.VITE_ENABLE_MOCKS === 'true',
} as const
