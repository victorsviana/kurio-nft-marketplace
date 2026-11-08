import { RadioGroup } from 'radix-ui'
import { useId } from 'react'
import { cn } from '@/lib/utils'
import type { Edition, EditionKind } from '@/shared/contracts'
import { isSoldOut } from '../lib/editions'

/** Pill widths measured in the Figma (1/1 36 · 1/10 42 · 1/50 46 · ABERTA 66). */
const PILL_WIDTH: Record<EditionKind, number> = { unique: 36, 'limited-10': 42, 'limited-50': 46, open: 66 }

/**
 * Edition selector (NFT-04) with radio-group semantics (arrow keys, one tab stop). A sold-out
 * edition is disabled, struck through and explained in text next to the pills, so the state
 * never depends on color alone (A11Y-05).
 */
export function EditionPicker({
  editions,
  value,
  onChange,
  compact = false,
}: {
  editions: Edition[]
  value: string
  onChange: (editionId: string) => void
  /** Mobile sheet: 8px under the label and 12px between pills. */
  compact?: boolean
}) {
  const labelId = useId()
  const reasonId = useId()
  const soldOut = editions.filter(isSoldOut)

  return (
    <div>
      <p id={labelId} className="text-[15px] leading-4 font-bold text-fg">
        Edição:
      </p>
      <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', compact ? 'mt-2' : 'mt-3')}>
        <RadioGroup.Root
          value={value}
          onValueChange={onChange}
          orientation="horizontal"
          aria-labelledby={labelId}
          aria-describedby={soldOut.length > 0 ? reasonId : undefined}
          className={cn('flex items-center', compact ? 'gap-3' : 'gap-1.5')}
        >
          {editions.map((edition) => {
            const out = isSoldOut(edition)
            return (
              <RadioGroup.Item
                key={edition.id}
                value={edition.id}
                disabled={out}
                data-testid={`edition-${edition.label}`}
                style={{ minWidth: PILL_WIDTH[edition.kind] }}
                className={cn(
                  'h-7 rounded-full border border-line px-1 text-sm leading-4 font-normal whitespace-nowrap text-fg-muted transition-colors',
                  'hover:border-line-soft hover:text-fg data-[state=checked]:border-brand data-[state=checked]:font-medium data-[state=checked]:text-brand-text',
                  'disabled:cursor-not-allowed disabled:border-line/70 disabled:text-fg-subtle/70 disabled:hover:text-fg-subtle/70',
                )}
              >
                <span className={cn(out && 'line-through decoration-1')}>{edition.label}</span>
                {out && <span className="sr-only"> — esgotada</span>}
              </RadioGroup.Item>
            )
          })}
        </RadioGroup.Root>
        {soldOut.length > 0 && (
          <p id={reasonId} className="text-xs leading-4 text-fg-subtle" data-testid="edition-sold-out-reason">
            {soldOut.map((e) => e.label).join(', ')} {soldOut.length === 1 ? 'esgotada' : 'esgotadas'}
          </p>
        )}
      </div>
    </div>
  )
}
