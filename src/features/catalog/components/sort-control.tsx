import { Select as SelectPrimitive } from 'radix-ui'
import { useId } from 'react'
import { MaskIcon } from '@/components/ui/mask-icon'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem } from '@/components/ui/select'
import { CATALOG_SORTS, type CatalogSort } from '@/shared/contracts'
import iconArrowDown from '../assets/icon-arrow-down.svg'
import { DEFAULT_SORT, SORT_LABELS } from '../lib/search'

/** "Ordenar por: Listados recentemente ˅" (desktop toolbar). Writes `?sort=` (CAT-04). */
export function SortSelect({ value, onChange }: { value: CatalogSort | undefined; onChange: (sort: CatalogSort) => void }) {
  const labelId = useId()
  const triggerId = useId()
  const current = value ?? DEFAULT_SORT
  return (
    <div className="flex shrink-0 items-center gap-1 text-[15px] leading-4 text-fg">
      <span id={labelId}>Ordenar por:</span>
      <Select value={current} onValueChange={(v) => onChange(v as CatalogSort)}>
        <SelectPrimitive.Trigger
          id={triggerId}
          aria-labelledby={`${labelId} ${triggerId}`}
          className="flex items-center gap-2 rounded-sm text-[15px] leading-4 text-fg hover:text-brand-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=open]:text-brand-text"
        >
          <SelectPrimitive.Value>{SORT_LABELS[current]}</SelectPrimitive.Value>
          <MaskIcon src={iconArrowDown} width={11} height={6} />
        </SelectPrimitive.Trigger>
        <SelectContent position="popper" align="end" className="border border-line-soft bg-surface">
          {CATALOG_SORTS.map((sort) => (
            <SelectItem key={sort} value={sort} className="py-2 text-sm focus:bg-surface-dark">
              {SORT_LABELS[sort]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Same choice as radio buttons, used inside the mobile filters Sheet. */
export function SortRadioGroup({ value, onChange }: { value: CatalogSort | undefined; onChange: (sort: CatalogSort) => void }) {
  const titleId = useId()
  return (
    <div className="flex flex-col gap-3 px-5 pt-5">
      <h3 id={titleId} className="text-lg leading-4 font-bold text-fg">
        Ordenar por
      </h3>
      <RadioGroup
        aria-labelledby={titleId}
        value={value ?? DEFAULT_SORT}
        onValueChange={(v) => onChange(v as CatalogSort)}
        className="gap-0 pl-3"
      >
        {CATALOG_SORTS.map((sort) => {
          const id = `${titleId}-${sort}`
          return (
            <label
              key={sort}
              htmlFor={id}
              className="flex h-10 cursor-pointer items-center gap-3 text-[15px] text-fg-muted has-[[data-state=checked]]:text-brand-text"
            >
              <RadioGroupItem id={id} value={sort} className="border-line-soft" />
              {SORT_LABELS[sort]}
            </label>
          )
        })}
      </RadioGroup>
    </div>
  )
}
