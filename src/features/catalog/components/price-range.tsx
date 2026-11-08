import { Slider as SliderPrimitive } from 'radix-ui'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatEthPtBr } from '@/shared/lib/format'
import { compactMoney, fromHundredths, toHundredths } from '../lib/search'

const thumbClass =
  'block size-[21px] rounded-full border-[3px] border-ink bg-brand shadow-none transition-[box-shadow] hover:ring-4 hover:ring-brand/25 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring'

/**
 * "Faixa de preço": two-thumb slider + "Aplicar" (CAT-03). The thumbs only move a local draft;
 * "Aplicar" writes `minPrice`/`maxPrice` to the URL. A thumb resting on the catalog bound
 * leaves that param out (default). Positions are integer hundredths computed with big.js;
 * labels and URL values stay decimal strings.
 *
 * Mount it with `key` = current URL bounds so back/forward resets the draft.
 */
export function PriceRange({
  range,
  minPrice,
  maxPrice,
  onApply,
}: {
  range: { min: string; max: string }
  minPrice: string | undefined
  maxPrice: string | undefined
  onApply: (bounds: { minPrice: string | undefined; maxPrice: string | undefined }) => void
}) {
  const lo = toHundredths(range.min)
  const hi = toHundredths(range.max)
  const clamp = (v: number) => Math.min(hi, Math.max(lo, v))
  const fromUrl: [number, number] = [
    clamp(minPrice ? toHundredths(minPrice) : lo),
    clamp(maxPrice ? toHundredths(maxPrice) : hi),
  ]
  const [draft, setDraft] = useState<[number, number] | null>(null)
  const [from, to] = draft ?? fromUrl
  const label = (v: number) => formatEthPtBr(fromHundredths(v))

  const apply = () => {
    const next = {
      minPrice: from <= lo ? undefined : compactMoney(fromHundredths(from)),
      maxPrice: to >= hi ? undefined : compactMoney(fromHundredths(to)),
    }
    if (next.minPrice !== minPrice || next.maxPrice !== maxPrice) onApply(next)
    setDraft(null)
  }

  return (
    <div className="flex flex-col gap-3 pl-3">
      <SliderPrimitive.Root
        min={lo}
        max={hi}
        step={1}
        value={[from, to]}
        onValueChange={(value) => setDraft([value[0] ?? lo, value[1] ?? hi])}
        className="relative flex h-[21px] w-full touch-none items-center select-none"
      >
        <SliderPrimitive.Track className="relative h-1 grow rounded-full bg-brand/35">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-brand" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb aria-label="Preço mínimo" aria-valuetext={`${label(from)} ETH`} className={thumbClass} />
        <SliderPrimitive.Thumb aria-label="Preço máximo" aria-valuetext={`${label(to)} ETH`} className={thumbClass} />
      </SliderPrimitive.Root>
      <p className="text-[15px] leading-5 text-fg" data-testid="price-range-label">
        Preço: {label(from)} - {label(to)} ETH
      </p>
      <Button type="button" onClick={apply} className="h-9 self-start rounded-md px-3 text-base font-bold">
        Aplicar
      </Button>
    </div>
  )
}
