import { Eye } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MaskIcon } from '@/components/ui/mask-icon'
import { cn } from '@/lib/utils'
import iconHide from '../assets/icon-hide.svg'
import { variantStyles, type AuthVariant } from './variant'

type InputProps = Omit<ComponentProps<'input'>, 'id' | 'value' | 'onChange' | 'className' | 'children'>

interface AuthFieldProps extends InputProps {
  id: string
  errorId: string
  /** Visually hidden label (the Figma only has placeholders). */
  label: string
  value: string
  error?: string
  /** Extra description read by screen readers (e.g. password rules). */
  hint?: string
  variant: AuthVariant
  onValueChange: (value: string) => void
  /** Control rendered inside the input on the right (show/hide password). */
  trailing?: ReactNode
}

/**
 * Input of the auth forms (A11Y-03): label linked by `htmlFor`, `aria-invalid` and the error
 * text linked by `aria-describedby`. Error states are not drawn in the Figma: danger border
 * plus a message under the field (text, so the state does not rely on color alone).
 */
export function AuthField({
  id,
  errorId,
  label,
  value,
  error,
  hint,
  variant,
  onValueChange,
  trailing,
  ...inputProps
}: AuthFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const describedBy = [error ? errorId : null, hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full border-line bg-transparent px-4 py-0 text-sm leading-4 text-fg placeholder:text-fg-subtle md:text-sm',
            'focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25',
            'aria-invalid:border-danger aria-invalid:ring-0 aria-invalid:focus-visible:ring-2 aria-invalid:focus-visible:ring-danger/25',
            variantStyles[variant].input,
            trailing ? 'pr-12' : null,
          )}
          {...inputProps}
        />
        {trailing}
      </div>
      {hint && (
        <span id={hintId} className="sr-only">
          {hint}
        </span>
      )}
      {error && (
        <p id={errorId} className="text-[13px] leading-4 text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Show/hide password toggle (`aria-pressed`, constant accessible name). It is a `type="button"`
 * so Enter in the password field still submits the form.
 */
export function PasswordToggle({
  controls,
  pressed,
  onToggle,
  label = 'Mostrar senha',
  variant,
}: {
  controls: string
  pressed: boolean
  onToggle: () => void
  label?: string
  variant: AuthVariant
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      aria-controls={controls}
      onClick={onToggle}
      className={cn(
        'absolute top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-[5px] text-fg-subtle transition-colors hover:text-fg',
        variant === 'desktop' ? 'right-1.5' : 'right-2',
      )}
    >
      {pressed ? (
        <Eye className="size-[19px]" strokeWidth={1.5} aria-hidden="true" />
      ) : (
        <MaskIcon src={iconHide} width={19} height={15} />
      )}
    </button>
  )
}
