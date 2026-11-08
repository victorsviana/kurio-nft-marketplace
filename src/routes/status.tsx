import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { http } from '@/shared/api/http'
import { createSocket } from '@/shared/realtime/socket'

export const Route = createFileRoute('/status')({
  component: StatusPage,
})

interface Health {
  status: string
  mocks: boolean
  time: string
}

type SocketState = 'connecting' | 'connected' | 'disconnected'

/**
 * Diagnostics page: proves REST goes through Axios → MSW and that realtime events
 * reach the app through socket.io-client → MSW WebSocket interception (RT-01, MOCK-01).
 */
function StatusPage() {
  const health = useQuery({
    queryKey: ['system', 'health'],
    queryFn: async ({ signal }) => (await http.get<Health>('/health', { signal })).data,
  })

  const [socketState, setSocketState] = useState<SocketState>('connecting')
  const [lastEvent, setLastEvent] = useState<string | null>(null)

  useEffect(() => {
    const socket = createSocket(null)
    socket.on('connect', () => setSocketState('connected'))
    socket.on('disconnect', () => setSocketState('disconnected'))
    socket.on('system.ready', (payload: { serverTime: string }) =>
      setLastEvent(`system.ready @ ${payload.serverTime}`),
    )
    socket.connect()
    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [])

  return (
    <section className="container-page flex flex-col gap-6 py-16">
      <h1 className="text-2xl font-bold">Status da simulação</h1>
      <dl className="grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-lg bg-surface p-6">
        <dt className="text-fg-muted">API REST</dt>
        <dd data-testid="rest-status">
          {health.isPending ? 'carregando…' : health.isError ? 'erro' : `ok (mocks: ${String(health.data.mocks)})`}
        </dd>
        <dt className="text-fg-muted">Socket.IO</dt>
        <dd data-testid="socket-status">{socketState}</dd>
        <dt className="text-fg-muted">Último evento</dt>
        <dd data-testid="socket-last-event">{lastEvent ?? '—'}</dd>
      </dl>
    </section>
  )
}
