import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { SessionSync } from '@/app/session-sync'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { useLayoutOptions } from '@/components/layout/layout-options'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { AnnouncerProvider } from '@/shared/a11y/announcer'
import { RealtimeProvider } from '@/shared/realtime/realtime-provider'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  const { mobileTabBar } = useLayoutOptions()
  return (
    <AnnouncerProvider>
      <RealtimeProvider>
        <SessionSync />
        <div className={cn('flex min-h-dvh flex-col', mobileTabBar && 'max-md:pb-[140px]')}>
          <a
            href="#conteudo"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:text-ink"
          >
            Pular para o conteúdo
          </a>
          <Header />
          <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
            <Outlet />
          </main>
          <Footer />
          {mobileTabBar && <MobileTabBar />}
        </div>
        <Toaster position="top-center" />
      </RealtimeProvider>
    </AnnouncerProvider>
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
