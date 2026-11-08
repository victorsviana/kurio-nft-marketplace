import Big from 'big.js'
import type { CatalogSearch, CatalogSort, CatalogTab } from '@/shared/contracts'

/**
 * Pure helpers for the catalog URL state. The URL is the only source of truth for
 * q/tab/category/network/price/sort/page (CAT-02..CAT-05); these functions only compute the
 * next canonical search object.
 */

export const DEFAULT_TAB: CatalogTab = 'all'
export const DEFAULT_SORT: CatalogSort = 'recent'

export const TAB_LABELS: Record<CatalogTab, string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

export const SORT_LABELS: Record<CatalogSort, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  name: 'Nome (A–Z)',
}

export function csvValues(csv: string | undefined): string[] {
  return csv ? csv.split(',').filter(Boolean) : []
}

/** Adds or removes `value` and keeps the canonical order of `allowed` (same URL = same key). */
export function toggleCsv<T extends string>(csv: string | undefined, value: T, allowed: readonly T[]): string | undefined {
  const current = new Set(csvValues(csv))
  if (current.has(value)) current.delete(value)
  else current.add(value)
  const next = allowed.filter((v) => current.has(v)).join(',')
  return next === '' ? undefined : next
}

/** Drops default values so they never reach the URL nor the API request. */
export function canonicalSearch(search: CatalogSearch): CatalogSearch {
  return {
    q: search.q?.trim() ? search.q.trim() : undefined,
    tab: search.tab === DEFAULT_TAB ? undefined : search.tab,
    category: search.category || undefined,
    network: search.network || undefined,
    minPrice: search.minPrice || undefined,
    maxPrice: search.maxPrice || undefined,
    sort: search.sort === DEFAULT_SORT ? undefined : search.sort,
    page: search.page && search.page > 1 ? search.page : undefined,
  }
}

/** Filters that "Limpar filtros" removes (everything except the sort order). */
export function hasActiveFilters(search: CatalogSearch): boolean {
  return Boolean(search.tab || hasRefinements(search))
}

/** Search term and sidebar filters (shown as removable chips; the tab is visible on its own). */
export function hasRefinements(search: CatalogSearch): boolean {
  return Boolean(search.q || search.category || search.network || search.minPrice || search.maxPrice)
}

/* ------------------------------------------------------------------------------------------
 * Price slider. Radix Slider needs numeric positions, so the slider runs on integer
 * hundredths of ETH computed with big.js. Display and URL values stay decimal strings.
 * ---------------------------------------------------------------------------------------- */

export function toHundredths(value: string): number {
  return new Big(value).times(100).round(0, Big.roundHalfUp).toNumber()
}

export function fromHundredths(value: number): string {
  return new Big(value).div(100).toFixed(2)
}

/** Strips trailing zeros so "12.30" and "12.3" produce the same URL value. */
export function compactMoney(value: string): string {
  return new Big(value).toString()
}
