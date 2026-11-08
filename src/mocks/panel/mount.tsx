import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ScenarioPanel } from './scenario-panel'

export const PANEL_VISIBILITY_KEY = 'kurio.mock.panel'

export function mountScenarioPanel() {
  try {
    if (localStorage.getItem(PANEL_VISIBILITY_KEY) === 'hidden') return
  } catch {
    /* storage unavailable: show the panel */
  }
  const host = document.createElement('div')
  host.id = 'kurio-mock-panel'
  document.body.appendChild(host)
  createRoot(host).render(
    <StrictMode>
      <ScenarioPanel />
    </StrictMode>,
  )
}
