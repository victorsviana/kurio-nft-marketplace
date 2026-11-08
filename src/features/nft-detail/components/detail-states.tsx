import { Link } from '@tanstack/react-router'
import { ErrorState } from '@/components/feedback/states'

/** NFT-03: the API answered 404 for this id. */
export function NftNotFound({ nftId }: { nftId: string }) {
  return (
    <section className="container-page flex flex-col items-start gap-4 py-24" data-testid="nft-not-found">
      <p className="text-sm tracking-[1.4px] text-fg-muted">Erro 404</p>
      <h1 className="text-3xl font-bold text-fg">NFT não encontrado</h1>
      <p className="max-w-xl text-fg-muted">
        Não existe nenhum NFT com o identificador <span className="break-all text-fg">“{nftId}”</span>. Ele pode ter sido
        removido do mercado ou o endereço está incorreto.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link to="/" className="rounded-md bg-brand px-4 py-2 font-bold text-ink hover:bg-brand-text">
          Voltar ao início
        </Link>
        <Link
          to="/"
          hash="catalogo"
          className="rounded-md border border-brand px-4 py-2 font-medium text-brand-text hover:bg-brand/10"
        >
          Explorar o mercado
        </Link>
      </div>
    </section>
  )
}

/** GEN-06: any other failure keeps the user on the page with a retry. */
export function NftLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <section className="container-page flex flex-col gap-4 py-16">
      <h1 className="sr-only">Detalhes do NFT</h1>
      <ErrorState error={error} title="Não foi possível carregar este NFT" onRetry={onRetry} />
      <Link to="/" className="self-center text-sm text-brand-text underline underline-offset-2 hover:text-fg">
        Voltar ao início
      </Link>
    </section>
  )
}
