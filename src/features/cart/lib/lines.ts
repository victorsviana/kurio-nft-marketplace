import type { Quote, QuoteIssue } from '@/shared/contracts'

/** "1 unidade" / "3 unidades". */
export const units = (n: number) => `${n} ${n === 1 ? 'unidade' : 'unidades'}`

/** "Resta 1 unidade" / "Restam 3 unidades". */
export const remaining = (n: number) => (n === 1 ? 'Resta 1 unidade' : `Restam ${n} unidades`)

/** Stock problem of one line as reported by the quote (the server decides `purchasable`). */
export type StockIssue = { type: 'SOLD_OUT' } | { type: 'AVAILABILITY_CHANGED'; available: number }

export function stockIssueFor(quote: Quote | undefined, itemId: string): StockIssue | null {
  const issue = quote?.issues.find(
    (i): i is QuoteIssue & { type: 'SOLD_OUT' | 'AVAILABILITY_CHANGED' } =>
      i.itemId === itemId && (i.type === 'SOLD_OUT' || i.type === 'AVAILABILITY_CHANGED'),
  )
  if (!issue) return null
  if (issue.type === 'SOLD_OUT') return { type: 'SOLD_OUT' }
  const available = Number.parseInt(issue.current, 10)
  return Number.isFinite(available) && available > 0 ? { type: 'AVAILABILITY_CHANGED', available } : { type: 'SOLD_OUT' }
}
