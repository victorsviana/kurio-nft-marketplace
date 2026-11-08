import { CircleAlert, Clock } from 'lucide-react'

export const EXPIRED_MESSAGE = 'Sua sessão expirou. Entre novamente para continuar.'

/** `?reason=expired` banner (AUTH-04): the user was sent here by an expired session. */
export function ExpiredNotice({ id }: { id: string }) {
  return (
    <p
      id={id}
      role="status"
      className="flex items-start gap-2 rounded-[5px] border border-brand/40 bg-brand/10 px-3 py-2.5 text-[13px] leading-4 text-fg"
    >
      <Clock className="mt-px size-3.5 shrink-0 text-brand-text" aria-hidden="true" />
      {EXPIRED_MESSAGE}
    </p>
  )
}

/**
 * Form-level failure (401 invalid credentials, offline, 5xx). It receives focus when shown, so
 * keyboard users land right above the fields; `role="alert"` also announces it.
 */
export function FormAlert({ id, message }: { id: string; message: string }) {
  return (
    <p
      id={id}
      role="alert"
      tabIndex={-1}
      className="flex items-start gap-2 rounded-[5px] border border-danger/50 bg-danger/10 px-3 py-2.5 text-[13px] leading-4 text-fg outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
    >
      <CircleAlert className="mt-px size-3.5 shrink-0 text-danger" aria-hidden="true" />
      {message}
    </p>
  )
}
