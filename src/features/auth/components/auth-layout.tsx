import { Link } from '@tanstack/react-router'
import { useCallback, useId, useState, type ReactNode } from 'react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { MaskIcon } from '@/components/ui/mask-icon'
import { cn } from '@/lib/utils'
import { comingSoon } from '@/shared/lib/coming-soon'
import type { AuthSearch } from '@/shared/session/auth-search'
import iconClose from '../assets/icon-close.svg'
import { useIsDesktop } from '../lib/use-is-desktop'
import { ExpiredNotice } from './form-feedback'
import type { AuthVariant } from './variant'

export type AuthMode = 'login' | 'signup'

const COPY = {
  login: {
    title: 'Entrar',
    subtitle: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
    mobileTitle: 'Entrar',
    mobileTitleSize: 'text-xl',
    switchTo: '/signup',
    switchLabel: 'Novo na Kurio? Crie uma conta',
  },
  signup: {
    title: 'Criar conta',
    subtitle: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
    mobileTitle: 'Criar perfil de colecionador',
    // 303-wide text box for 28 monospace glyphs in the frame = 18px (the login title is 20).
    mobileTitleSize: 'text-lg',
    switchTo: '/login',
    switchLabel: 'Já tem uma conta? Entre',
  },
} as const

export interface AuthSlotProps {
  variant: AuthVariant
  /** "Em breve" notice for out-of-scope actions (forgot password, social login), GEN-03. */
  onComingSoon: (feature: string) => void
}

interface AuthLayoutProps {
  mode: AuthMode
  search: AuthSearch
  /** Field focused when the modal opens. */
  initialFocusId: string
  onClose: () => void
  children: (slot: AuthSlotProps) => ReactNode
}

/**
 * Auth screen shell. From `md` up the form lives in an open modal over the page (Figma Sign
 * In / Sign Up modals); below it is a full-screen page (Mobile / Login, Mobile / Cadastro).
 * The URL stays /login or /signup either way, so direct access and refresh work (GEN-02).
 */
export function AuthLayout({ mode, search, initialFocusId, onClose, children }: AuthLayoutProps) {
  const isDesktop = useIsDesktop()
  const expiredId = useId()
  const expired = search.reason === 'expired'
  const [notice, setNotice] = useState('')

  const onComingSoon = useCallback(
    (feature: string) => {
      comingSoon(feature)
      // The modal hides the rest of the page (and its live regions) from assistive tech, so it
      // carries its own polite region; on mobile the toast region is enough.
      if (isDesktop) {
        setNotice('')
        window.setTimeout(() => setNotice(`${feature}: em breve. Este recurso não faz parte da demonstração.`), 60)
      }
    },
    [isDesktop],
  )

  if (isDesktop) {
    return (
      <AuthDialog mode={mode} search={search} initialFocusId={initialFocusId} onClose={onClose} expiredId={expired ? expiredId : undefined}>
        {children({ variant: 'desktop', onComingSoon })}
        <p className="sr-only" role="status" aria-live="polite">
          {notice}
        </p>
      </AuthDialog>
    )
  }
  return (
    <AuthMobilePage mode={mode} search={search} expiredId={expired ? expiredId : undefined}>
      {children({ variant: 'mobile', onComingSoon })}
    </AuthMobilePage>
  )
}

/* --------------------------------- desktop -------------------------------- */

/** Toasts render outside the modal; interacting with one must not dismiss the form. */
function keepOpenOnToast(event: Event) {
  const target = event.target
  if (target instanceof Element && target.closest('[data-sonner-toaster]')) event.preventDefault()
}

/**
 * Focus return (A11Y-02): back to the control that opened the modal when it still exists (e.g.
 * the header "Entrar" link); otherwise (direct access, or the link was replaced by the account
 * menu after signing in) to the main landmark of the page we navigated to.
 */
function restoreFocus(opener: HTMLElement | null) {
  if (opener && opener !== document.body && opener.isConnected) {
    opener.focus()
    return
  }
  document.getElementById('conteudo')?.focus()
}

function AuthDialog({
  mode,
  search,
  initialFocusId,
  onClose,
  expiredId,
  children,
}: Omit<AuthLayoutProps, 'children'> & { expiredId?: string; children: ReactNode }) {
  const [opener] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null))
  const copy = COPY[mode]

  return (
    <>
      {/* Page behind the scrim (the Figma shows the Home there; see ARCHITECTURE deviations). */}
      <div aria-hidden="true" className="min-h-[calc(100dvh-84px)]" />
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
      >
        <DialogContent
          showCloseButton={false}
          aria-describedby={expiredId}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            document.getElementById(initialFocusId)?.focus()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            restoreFocus(opener)
          }}
          onInteractOutside={keepOpenOnToast}
          className="flex max-h-[calc(100dvh-2rem)] w-[500px] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-y-auto rounded-lg bg-surface p-0 text-fg ring-0 sm:max-w-[500px]"
        >
          <div className={cn('flex flex-col pb-10', mode === 'login' ? 'min-h-[590px]' : 'min-h-[646px]')}>
            <header className="flex flex-col items-center gap-10 px-10 pt-12">
              <DialogTitle className="sr-only">{copy.title}</DialogTitle>
              <AuthSwitch mode={mode} redirect={search.redirect} />
              <DialogDescription className="text-center text-[13px] leading-4 text-fg">{copy.subtitle}</DialogDescription>
            </header>
            {expiredId && (
              <div className="px-20 pt-6">
                <ExpiredNotice id={expiredId} />
              </div>
            )}
            <div className="flex flex-col pt-6">{children}</div>
          </div>
          {/* Decorative Primary stripe glued to the bottom edge. */}
          <div aria-hidden="true" className="mt-auto h-2.5 shrink-0 bg-brand" />
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Fechar"
              className="absolute top-1 right-[5px] grid size-8 place-items-center rounded-[5px] text-brand transition-colors hover:text-brand-text"
            >
              <MaskIcon src={iconClose} width={18} height={18} />
            </button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** "Entrar | Criar conta": plain navigation between /login and /signup, keeping `redirect`. */
function AuthSwitch({ mode, redirect }: { mode: AuthMode; redirect?: string }) {
  const item = (active: boolean) =>
    cn('rounded-[3px] transition-colors', active ? 'text-brand-text' : 'text-fg hover:text-brand-text')
  return (
    <nav aria-label="Entrar ou criar conta" className="flex items-center gap-2 text-xl leading-4 font-medium">
      <Link to="/login" search={{ redirect }} aria-current={mode === 'login' ? 'page' : undefined} className={item(mode === 'login')}>
        Entrar
      </Link>
      <span aria-hidden="true" className="h-5 w-px bg-[#f0805f]" />
      <Link to="/signup" search={{ redirect }} aria-current={mode === 'signup' ? 'page' : undefined} className={item(mode === 'signup')}>
        Criar conta
      </Link>
    </nav>
  )
}

/* --------------------------------- mobile --------------------------------- */

function AuthMobilePage({
  mode,
  search,
  expiredId,
  children,
}: Pick<AuthLayoutProps, 'mode' | 'search'> & { expiredId?: string; children: ReactNode }) {
  const titleId = useId()
  const copy = COPY[mode]
  return (
    <section aria-labelledby={titleId} className="mx-auto flex min-h-dvh w-full max-w-[414px] flex-col px-7 pt-20 pb-6">
      <div className="flex h-[136px] items-center justify-center">
        <Link to="/" aria-label="Kurio — início" className="rounded-[5px] text-[32px] leading-[42px] font-bold tracking-[0.1em] text-fg">
          KURIO
        </Link>
      </div>
      <h1 id={titleId} className={cn('mt-9 text-center font-bold', copy.mobileTitleSize, 'leading-6')}>
        {copy.mobileTitle}
      </h1>
      {expiredId && (
        <div className="mt-6">
          <ExpiredNotice id={expiredId} />
        </div>
      )}
      <div className={cn('flex flex-col', expiredId ? 'mt-6' : 'mt-9')}>{children}</div>
      <p className="mt-10 text-center text-sm leading-5 text-fg-muted">
        <Link
          to={copy.switchTo}
          search={{ redirect: search.redirect }}
          className="rounded-[3px] underline-offset-4 transition-colors hover:text-brand-text hover:underline"
        >
          {copy.switchLabel}
        </Link>
      </p>
    </section>
  )
}
