import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:text-ink"
      >
        Pular para o conteúdo
      </a>
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

function NotFound() {
  return (
    <section className="container-page flex flex-col items-start gap-4 py-24">
      <p className="text-sm tracking-[1.4px] text-fg-muted">Erro 404</p>
      <h1 className="text-3xl font-bold">Página não encontrada</h1>
      <p className="text-fg-muted">O endereço acessado não existe ou foi removido.</p>
      <Link to="/" className="rounded-md bg-brand px-4 py-2 font-bold text-ink">
        Voltar ao início
      </Link>
    </section>
  )
}
