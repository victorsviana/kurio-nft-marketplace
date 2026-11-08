/** Short-lived visual cue after a realtime price change (the live region speaks the same news). */
export function PriceUpdatedChip() {
  return (
    <span
      aria-hidden="true"
      data-testid="price-updated-chip"
      className="animate-in rounded-full border border-brand/60 px-2 py-0.5 text-[11px] leading-3 font-medium text-brand-text fade-in-0"
    >
      preço atualizado
    </span>
  )
}
