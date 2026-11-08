import { MaskIcon } from '@/components/ui/mask-icon'
import { cn } from '@/lib/utils'
import iconMinus from '../assets/icon-minus.svg'
import iconPlus from '../assets/icon-plus.svg'

const SIZES = {
  /** Desktop: 33 × 49.5 pill, icon 26.4, number 20/28. */
  lg: {
    button: 'h-[49.5px] w-[33px] rounded-[33px] shadow-[0_6.6px_9.9px_rgba(20,13,10,0.15)]',
    icon: 26.4,
    value: 'text-xl leading-7 font-normal',
  },
  /** Mobile buy bar: 20 × 30 pill (hit area enlarged), icon 16, number 18/25 medium. */
  sm: {
    button:
      'h-[30px] w-5 rounded-[20px] shadow-[0_4px_6px_rgba(20,13,10,0.15)] after:absolute after:-inset-x-2.5 after:-inset-y-2 after:content-[""]',
    icon: 16,
    value: 'text-lg leading-[25px] font-medium',
  },
} as const

/**
 * Quantity stepper (NFT-05). Bounds use `aria-disabled` instead of `disabled` so keyboard
 * focus stays on the button when a limit is reached; the handlers announce the limit.
 */
export function QuantityStepper({
  quantity,
  max,
  onIncrement,
  onDecrement,
  size,
  labelledBy,
  className,
}: {
  quantity: number
  max: number
  onIncrement: () => void
  onDecrement: () => void
  size: keyof typeof SIZES
  /** id of a visible label ("Qtd."); otherwise the group is named "Quantidade". */
  labelledBy?: string
  className?: string
}) {
  const s = SIZES[size]
  const atMin = max === 0 || quantity <= 1
  const atMax = max === 0 || quantity >= max
  const button = cn(
    'relative grid shrink-0 place-items-center border border-ink bg-brand text-ink transition-opacity',
    'hover:bg-brand-text aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-brand',
    s.button,
  )

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : 'Quantidade'}
      className={cn('flex items-center gap-3', className)}
    >
      <button type="button" className={button} aria-disabled={atMin} aria-label="Diminuir quantidade" onClick={onDecrement}>
        <MaskIcon src={iconMinus} width={s.icon} height={s.icon} />
      </button>
      <span data-testid="nft-quantity" className={cn('min-w-[1.5ch] text-center text-fg tabular-nums', s.value)}>
        {quantity}
      </span>
      <button type="button" className={button} aria-disabled={atMax} aria-label="Aumentar quantidade" onClick={onIncrement}>
        <MaskIcon src={iconPlus} width={s.icon} height={s.icon} />
      </button>
    </div>
  )
}
