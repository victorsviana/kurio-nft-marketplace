import { useId, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { mapAuthError, type FieldErrors, type ParseResult, type Values } from './validation'

interface AuthFormOptions<F extends string, P> {
  /** Fields in visual order (the first invalid one receives focus). */
  fields: readonly F[]
  validateField: (field: F, values: Values<F>) => string | undefined
  parse: (values: Values<F>) => ParseResult<F, P>
  /** Fields re-validated when another one changes (e.g. confirmation follows the password). */
  dependents?: Partial<Record<F, F>>
  /** Sends the validated payload; return value is ignored. */
  onValid: (payload: P) => void
}

const emptyValues = <F extends string>(fields: readonly F[]) =>
  Object.fromEntries(fields.map((field) => [field, ''])) as Values<F>

export interface AuthFormState<F extends string> {
  values: Values<F>
  errors: FieldErrors<F>
  formError: string | null
  alertId: string
  fieldId: (field: F) => string
  errorId: (field: F) => string
  setValue: (field: F, value: string) => void
  submit: (event: FormEvent<HTMLFormElement>) => void
  showServerError: (error: unknown) => void
}

/**
 * Form state shared by the login and sign-up screens (AUTH-01, AUTH-02, A11Y-03).
 * - Errors appear on submit; fixing a field clears (or updates) its error while typing. There
 *   is no validation on blur on purpose: an error appearing on blur shifts the layout between
 *   mousedown and mouseup on the submit button, and the click (or tap) is lost.
 * - Submitting with errors moves focus to the first invalid field; a form-level failure moves
 *   focus to the alert so it is read and the user lands right above the fields.
 * - Values live only in memory: the password is never persisted or logged.
 * The state lives in the screen component, so switching between the desktop modal and the
 * mobile page (resize/rotation) keeps what the user typed.
 */
export function useAuthForm<F extends string, P>({
  fields,
  validateField,
  parse,
  dependents,
  onValid,
}: AuthFormOptions<F, P>): AuthFormState<F> {
  const baseId = useId()
  const [values, setValues] = useState<Values<F>>(() => emptyValues(fields))
  const [errors, setErrors] = useState<FieldErrors<F>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const fieldId = (field: F) => `${baseId}-${field}`
  const errorId = (field: F) => `${baseId}-${field}-error`
  const alertId = `${baseId}-alert`

  const focusById = (id: string) => document.getElementById(id)?.focus()

  const showFieldErrors = (next: FieldErrors<F>) => {
    flushSync(() => {
      setErrors(next)
      setFormError(null)
    })
    const first = fields.find((field) => next[field])
    if (first) focusById(fieldId(first))
  }

  const setValue = (field: F, value: string) => {
    const next = { ...values, [field]: value }
    setValues(next)
    setFormError(null)
    const dependent = dependents?.[field]
    setErrors((prev) => {
      if (!prev[field] && !(dependent && prev[dependent])) return prev
      const updated = { ...prev }
      if (prev[field]) updated[field] = validateField(field, next)
      if (dependent && prev[dependent] && next[dependent]) updated[dependent] = validateField(dependent, next)
      return updated
    })
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = parse(values)
    if (!result.ok) {
      showFieldErrors(result.errors)
      return
    }
    setErrors({})
    setFormError(null)
    onValid(result.data)
  }

  /** Puts an API failure on the fields (409/422) or in the form-level alert (401, offline, 5xx). */
  const showServerError = (error: unknown) => {
    const mapped = mapAuthError(error, fields)
    if (mapped.formError === null) {
      showFieldErrors(mapped.fieldErrors)
      return
    }
    flushSync(() => setFormError(mapped.formError))
    focusById(alertId)
  }

  return { values, errors, formError, fieldId, errorId, alertId, setValue, submit, showServerError }
}

