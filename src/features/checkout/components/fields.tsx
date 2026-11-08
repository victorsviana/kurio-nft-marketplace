import { Select as SelectPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { MaskIcon } from '@/components/ui/mask-icon'
import { SelectContent, SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import iconArrowDown from '../assets/icon-arrow-down.svg'
import { controlClass } from './control-class'

/**
 * Form controls of "Perfil do colecionador" (Figma 70522:3321, A11Y-03): visible label with the
 * coral asterisk for required fields, `aria-required`, `aria-invalid` and the error text linked
 * by `aria-describedby`. Error states are not drawn in the Figma: danger border plus a message
 * under the field (text, so the state does not rely on color alone).
 */


interface FieldShellProps {
  id: string
  errorId: string
  label: string
  required?: boolean
  /** The Figma shows only a placeholder: the label stays for screen readers. */
  hiddenLabel?: boolean
  /** Keeps the row aligned with the neighbour column when the label is hidden (desktop grid). */
  reserveLabelSpace?: boolean
  error?: string
  className?: string
  children: ReactNode
}

export function FieldShell({ id, errorId, label, required, hiddenLabel, reserveLabelSpace, error, className, children }: FieldShellProps) {
  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      {hiddenLabel ? (
        <>
          <label htmlFor={id} className="sr-only">
            {label}
          </label>
          {reserveLabelSpace && <span aria-hidden="true" className="hidden h-[29px] md:block" />}
        </>
      ) : (
        <label htmlFor={id} className="flex h-[29px] items-center gap-0.5 text-[15px] leading-[15px] text-fg">
          {label}
          {required && (
            <span aria-hidden="true" className="text-[22px] leading-[29px] text-[#F0805F]">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error && (
        <p id={errorId} className="mt-1.5 text-[13px] leading-4 text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

type InputProps = Omit<ComponentProps<'input'>, 'id' | 'value' | 'onChange' | 'className'>

export function TextField({
  id,
  errorId,
  label,
  required,
  hiddenLabel,
  reserveLabelSpace,
  error,
  value,
  onValueChange,
  className,
  ...inputProps
}: Omit<FieldShellProps, 'children'> & InputProps & { value: string; onValueChange: (value: string) => void }) {
  return (
    <FieldShell {...{ id, errorId, label, required, hiddenLabel, reserveLabelSpace, error, className }}>
      <input
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={controlClass}
        {...inputProps}
      />
    </FieldShell>
  )
}

export function TextAreaField({
  id,
  errorId,
  label,
  error,
  value,
  onValueChange,
  className,
  disabled,
}: Omit<FieldShellProps, 'children'> & { value: string; onValueChange: (value: string) => void; disabled?: boolean }) {
  return (
    <FieldShell {...{ id, errorId, label, error, className }}>
      <textarea
        id={id}
        value={value}
        disabled={disabled}
        maxLength={280}
        onChange={(event) => onValueChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(controlClass, 'mt-3 h-[152px] resize-none py-2.5 leading-5')}
      />
    </FieldShell>
  )
}

export interface SelectOption {
  value: string
  label: string
}

export function SelectField({
  id,
  errorId,
  label,
  required,
  error,
  value,
  options,
  placeholder,
  onValueChange,
  className,
  compact,
  disabled,
}: Omit<FieldShellProps, 'children'> & {
  value: string
  options: readonly SelectOption[]
  placeholder?: string
  onValueChange: (value: string) => void
  /** "Nome ENS": 78×40 control with ".eth" (Figma). */
  compact?: boolean
  disabled?: boolean
}) {
  const current = options.find((option) => option.value === value)
  return (
    <FieldShell {...{ id, errorId, label, required, error, className }}>
      <SelectPrimitive.Root value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          id={id}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            controlClass,
            'flex items-center justify-between gap-2 text-left data-[placeholder]:text-fg-subtle',
            compact ? 'w-[78px] pl-3 text-[15px]' : null,
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder}>{current?.label}</SelectPrimitive.Value>
          <MaskIcon src={iconArrowDown} width={18} height={18} className={compact ? 'text-fg' : 'text-fg-subtle'} />
        </SelectPrimitive.Trigger>
        <SelectContent position="popper" align="start" className="border border-line-soft bg-surface">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="py-2 text-sm focus:bg-surface-dark">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectPrimitive.Root>
    </FieldShell>
  )
}
