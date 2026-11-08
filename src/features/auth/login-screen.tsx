import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLogin } from '@/shared/session/auth'
import type { AuthSearch } from '@/shared/session/auth-search'
import { AuthField, PasswordToggle } from './components/auth-field'
import { AuthLayout } from './components/auth-layout'
import { FormAlert } from './components/form-feedback'
import { SocialLogin } from './components/social-login'
import { variantStyles } from './components/variant'
import { useAuthExit } from './lib/navigation'
import { useAuthForm } from './lib/use-auth-form'
import { LOGIN_FIELDS, parseLogin, validateLoginField } from './lib/validation'

/**
 * Login ("Entrar") — AUTH-02, AUTH-04, A11Y-02, A11Y-03, A11Y-04. Invalid credentials are a
 * form-level alert; success returns to `?redirect=` (same-origin only).
 */
export function LoginScreen({ search }: { search: AuthSearch }) {
  const exit = useAuthExit(search)
  const login = useLogin()
  const [showPassword, setShowPassword] = useState(false)
  const form = useAuthForm({
    fields: LOGIN_FIELDS,
    validateField: validateLoginField,
    parse: parseLogin,
    onValid: (payload) => {
      if (login.isPending) return
      login.mutate(payload, {
        onSuccess: (response) => void exit.complete(response.user, 'login'),
        onError: form.showServerError,
      })
    },
  })
  // Stays disabled after success too, until the redirect unmounts the screen.
  const busy = login.isPending || login.isSuccess

  return (
    <AuthLayout mode="login" search={search} initialFocusId={form.fieldId('email')} onClose={exit.close}>
      {({ variant, onComingSoon }) => {
        const styles = variantStyles[variant]
        const desktop = variant === 'desktop'
        return (
          <>
            <form noValidate aria-label="Entrar" onSubmit={form.submit} className="flex flex-col">
              <div className={cn('flex flex-col gap-3', styles.column)}>
                {form.formError && <FormAlert id={form.alertId} message={form.formError} />}
                <AuthField
                  id={form.fieldId('email')}
                  errorId={form.errorId('email')}
                  label="E-mail"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="contato@email.com"
                  variant={variant}
                  value={form.values.email}
                  error={form.errors.email}
                  onValueChange={(value) => form.setValue('email', value)}
                />
                <AuthField
                  id={form.fieldId('password')}
                  errorId={form.errorId('password')}
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Senha"
                  variant={variant}
                  value={form.values.password}
                  error={form.errors.password}
                  onValueChange={(value) => form.setValue('password', value)}
                  trailing={
                    <PasswordToggle
                      variant={variant}
                      controls={form.fieldId('password')}
                      pressed={showPassword}
                      onToggle={() => setShowPassword((shown) => !shown)}
                    />
                  }
                />
                <button
                  type="button"
                  onClick={() => onComingSoon('Recuperação de senha')}
                  className="self-end rounded-[3px] text-sm leading-4 text-brand-text underline-offset-4 hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className={cn(styles.column, desktop ? 'pt-6' : 'pt-10')}>
                <Button type="submit" disabled={busy} className={cn('w-full border-0 text-base leading-4 font-bold', styles.cta)}>
                  {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {busy ? 'Entrando…' : 'Entrar'}
                </Button>
              </div>
            </form>
            <SocialLogin variant={variant} onComingSoon={onComingSoon} className={desktop ? 'pt-6' : 'pt-10'} />
          </>
        )
      }}
    </AuthLayout>
  )
}
