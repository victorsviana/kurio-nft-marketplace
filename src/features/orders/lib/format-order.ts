/**
 * Receipt formatting (Figma "Confirmação de pedido"). Pure helpers, no money math: values
 * shown are the decimal strings of the order snapshot (ORD-05).
 */

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const

/** "29 Jul, 2026" in America/Sao_Paulo, as in the Figma meta row. */
export function formatReceiptDate(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(new Date(iso))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('day')} ${MONTHS[Number(get('month')) - 1]}, ${get('year')}`
}

/** Full date for assistive tech ("29 de julho de 2026, 14:03"). */
export function formatReceiptDateLong(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(iso))
}

/** "0xA91F…E82C": 0x + first 4 and last 4 hex digits, uppercased. */
export function shortHash(hash: string): string {
  const body = hash.startsWith('0x') ? hash.slice(2) : hash
  if (body.length <= 10) return hash
  return `0x${body.slice(0, 4).toUpperCase()}…${body.slice(-4).toUpperCase()}`
}

/** Kept free of app imports (no `@/` alias) so the E2E suite can reuse these helpers. */
export const EXPLORER_LABELS: Record<'ethereum' | 'polygon' | 'solana', string> = {
  ethereum: 'Etherscan',
  polygon: 'Polygonscan',
  solana: 'Solscan',
}
