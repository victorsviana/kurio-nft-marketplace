import { http, HttpResponse } from 'msw'
import { config } from '@/shared/config'

const api = (path: string) => `${config.apiBaseUrl}${path}`

export const systemHandlers = [
  http.get(api('/health'), () =>
    HttpResponse.json({ status: 'ok', mocks: true, time: new Date().toISOString() }),
  ),
]
