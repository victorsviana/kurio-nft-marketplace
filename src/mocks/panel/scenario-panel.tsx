import { useEffect, useId, useState } from 'react'
import { mockControl } from '../control'
import { getScenario, onScenarioChange, type ScenarioId } from '../scenarios/engine'

/**
 * Scenario panel (MOCK-03, MOCK-04). Part of the mock layer: it only talks to the simulated
 * backend through `mockControl`, never to the app's cache or state. Hidden when
 * localStorage["kurio.mock.panel"] === "hidden" (used by visual regression tests).
 */
export function ScenarioPanel() {
  const [open, setOpen] = useState(false)
  const [scenario, setScenarioState] = useState<ScenarioId>(getScenario().id)
  const [nftId, setNftId] = useState('emerald-ape-042')
  const [price, setPrice] = useState('1.49')
  const [status, setStatus] = useState('')
  const panelId = useId()

  useEffect(() => onScenarioChange((s) => setScenarioState(s.id)), [])
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const run = (label: string, action: () => unknown) => {
    try {
      action()
      setStatus(`${label}: ok`)
    } catch (error) {
      setStatus(`${label}: ${error instanceof Error ? error.message : 'falhou'}`)
    }
  }

  const button =
    'rounded-md border border-line-soft bg-surface-dark px-2.5 py-1.5 text-left text-xs font-medium text-fg hover:border-brand focus-visible:outline-2 focus-visible:outline-ring'

  return (
    <div className="fixed bottom-[140px] left-3 z-[60] font-sans text-fg md:bottom-4 md:left-4">
      {open && (
        <section
          id={panelId}
          aria-label="Painel de simulação"
          className="mb-2 max-h-[70dvh] w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-lg border border-line-soft bg-surface p-4 shadow-2xl"
        >
          <h2 className="text-sm font-bold">Cenário da API simulada</h2>
          <fieldset className="mt-3 flex flex-col gap-1.5">
            <legend className="sr-only">Cenário</legend>
            {mockControl.scenarios().map((s) => (
              <label key={s.id} className="flex cursor-pointer items-start gap-2 text-xs">
                <input
                  type="radio"
                  name="kurio-scenario"
                  className="mt-0.5 accent-brand"
                  checked={scenario === s.id}
                  onChange={() => run(`Cenário ${s.label}`, () => mockControl.setScenario(s.id))}
                />
                <span>
                  <span className="font-bold">{s.label}</span>
                  <span className="block text-fg-muted">{s.description}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <h2 className="mt-4 text-sm font-bold">Ações no servidor</h2>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <label className="col-span-2 flex flex-col gap-1 text-xs text-fg-muted">
              NFT (id)
              <input
                value={nftId}
                onChange={(e) => setNftId(e.target.value)}
                className="rounded-md border border-line-soft bg-ink px-2 py-1.5 text-fg"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-fg-muted">
              Novo preço (ETH)
              <input
                value={price}
                inputMode="decimal"
                onChange={(e) => setPrice(e.target.value)}
                className="rounded-md border border-line-soft bg-ink px-2 py-1.5 text-fg"
              />
            </label>
            <button type="button" className={`${button} self-end`} onClick={() => run('Preço alterado', () => mockControl.nft.setPrice(nftId, price))}>
              Alterar preço
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={button} onClick={() => run('Edição esgotada', () => mockControl.nft.sellOut(nftId))}>
              Esgotar edição padrão
            </button>
            <button type="button" className={button} onClick={() => run('Sessões expiradas', mockControl.expireSessions)}>
              Expirar sessão
            </button>
            <button type="button" className={button} onClick={() => run('Evento reenviado', mockControl.realtime.replayLastEvent)}>
              Reenviar último evento
            </button>
            <button type="button" className={button} onClick={() => run('Evento antigo', () => mockControl.realtime.emitStaleNftEvent(nftId))}>
              Enviar evento antigo
            </button>
            <button
              type="button"
              className={button}
              onClick={() => run('Socket derrubado', () => mockControl.realtime.dropAllConnections())}
            >
              Derrubar Socket.IO
            </button>
          </div>

          <button
            type="button"
            className="mt-4 w-full rounded-md bg-brand px-3 py-2 text-sm font-bold text-ink"
            onClick={() => {
              void mockControl.reset().then(() => {
                try {
                  localStorage.removeItem('kurio.session')
                  localStorage.removeItem('kurio.guestCartId')
                } catch {
                  /* ignore */
                }
                window.location.assign('/')
              })
            }}
          >
            Restaurar dados e cenário padrão
          </button>
          <p role="status" aria-live="polite" className="mt-2 min-h-4 text-xs text-fg-muted">
            {status}
          </p>
        </section>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-line-soft bg-surface-dark/95 px-3 py-1.5 text-xs font-bold text-brand-text shadow-lg"
      >
        Simulação · {getScenario().label}
      </button>
    </div>
  )
}
