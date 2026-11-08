import Big from 'big.js'

/**
 * ETH amounts are decimal strings end to end (CART-08). Formatting never goes through a JS
 * number: at least 2 decimals, never fewer than the value carries ("1.19 ETH", "0.195 ETH").
 */
export function formatEth(value: string, options: { suffix?: boolean } = {}): string {
  const decimals = value.includes('.') ? value.split('.')[1]!.replace(/0+$/, '').length : 0
  const text = new Big(value).toFixed(Math.max(2, decimals))
  return options.suffix === false ? text : `${text} ETH`
}

/** pt-BR decimal comma, used by the Figma in the price filter ("0,02 - 12,30 ETH"). */
export function formatEthPtBr(value: string): string {
  return formatEth(value, { suffix: false }).replace('.', ',')
}

const RESPONSIVE_WIDTHS = [256, 512, 960] as const

/**
 * Responsive sources for an NFT artwork. Fixture images follow the `<name>-512.webp`
 * convention produced by `npm run images`; other URLs are returned untouched.
 */
export function nftImageSources(url: string): { src: string; srcSet?: string } {
  const match = url.match(/^(.*)-(\d+)\.webp$/)
  if (!match) return { src: url }
  const base = match[1]
  return { src: url, srcSet: RESPONSIVE_WIDTHS.map((w) => `${base}-${w}.webp ${w}w`).join(', ') }
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date(iso))
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address
}
