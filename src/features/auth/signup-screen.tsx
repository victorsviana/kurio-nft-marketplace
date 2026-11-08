import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRegister } from '@/shared/session/auth'
import type { AuthSearch } from '@/shared/session/auth-search'
import { AuthField, PasswordToggle } from './components/auth-field'
import { AuthLayout } from './components/auth-layout'
import { FormAlert } from './components/form-feedback'
import { SocialLogin } from './components/social-login'
import { variantStyles } from './components/variant'
import { useAuthExit } from './lib/navigation'
import { useAuthForm } from './lib/use-auth-form'
import { parseSignup, SIGNUP_FIELDS, validateSignupField } from './lib/validation'

const PASSWORD_HINT = 'Mínimo de 8 caracteres, com letras e números.'

/**
 * Sign up ("Criar conta") — AUTH-01, A11Y-03. 409 conflicts (e-mail or username taken) and 422
 * validation errors from the API land on the matching field. The Figma form has no display
 * name: the server defaults it to the username.
 */
export function SignupScreen({ search }: { search: AuthSearch }) {
  const exit = useAuthExit(search)
  const register = useRegister()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const form = useAuthForm({
    fields: SIGNUP_FIELDS,
    validateField: validateSignupField,
    parse: parseSignup,
    dependents: { password: 'confirmPassword' },
    onValid: (payload) => {
      if (register.isPending) return
      register.mutate(payload, {
        onSuccess: (response) => void exit.complete(response.user, 'signup'),
        onError: form.showServerError,
      })
    },
  })
  const busy = register.isPending || register.isSuccess

  return (
    <AuthLayout mode="signup" search={search} initialFocusId={form.fieldId('username')} onClose={exit.close}>
      {({ variant, onComingSoon }) => {
        const styles = variantStyles[variant]
        const desktop = variant === 'desktop'
        // Figma: the desktop modal has the eye only on "Senha" (it reveals both fields); the
        // mobile frame has one on each field.
        const confirmShown = desktop ? showPassword : showConfirm
        const idle = desktop ? 'Criar conta' : 'Criar perfil'
        return (
          <>
            <form noValidate aria-label="Criar conta" onSubmit={form.submit} className="flex flex-col">
              <div className={cn('flex flex-col gap-3', styles.column)}>
                {form.formError && <FormAlert id={form.alertId} message={form.formError} />}
                <AuthField
                  id={form.fieldId('username')}
                  errorId={form.errorId('username')}
                  label="Nome de usuário"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Nome de usuário"
                  variant={variant}
                  value={form.values.username}
                  error={form.errors.username}
                  onValueChange={(value) => form.setValue('username', value)}
                />
                <AuthField
                  id={form.fieldId('email')}
                  errorId={form.errorId('email')}
                  label="E-mail"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Digite seu e-mail"
                  variant={variant}
                  value={form.values.email}
                  error={form.errors.email}
                  onValueChange={(value) => form.setValue('email', value)}
                />
                <AuthField
                  id={form.fieldId('password')}
                  errorId={form.errorId('password')}
                  label="Senha"
                  hint={PASSWORD_HINT}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Senha"
                  variant={variant}
                  value={form.values.password}
                  error={form.errors.password}
                  onValueChange={(value) => form.setValue('password', value)}
                  trailing={
                    <PasswordToggle
                      variant={variant}
                      controls={desktop ? `${form.fieldId('password')} ${form.fieldId('confirmPassword')}` : form.fieldId('password')}
                      pressed={showPassword}
                      onToggle={() => setShowPassword((shown) => !shown)}
                    />
                  }
                />
                <AuthField
                  id={form.fieldId('confirmPassword')}
                  errorId={form.errorId('confirmPassword')}
                  label="Confirmar senha"
                  type={confirmShown ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Confirmar senha"
                  variant={variant}
                  value={form.values.confirmPassword}
                  error={form.errors.confirmPassword}
                  onValueChange={(value) => form.setValue('confirmPassword', value)}
                  trailing={
                    desktop ? undefined : (
                      <PasswordToggle
                        variant={variant}
                        label="Mostrar confirmação de senha"
                        controls={form.fieldId('confirmPassword')}
                        pressed={showConfirm}
                        onToggle={() => setShowConfirm((shown) => !shown)}
                      />
                    )
                  }
                />
              </div>
              <div className={cn(styles.column, desktop ? 'pt-6' : 'pt-10')}>
                <Button type="submit" disabled={busy} className={cn('w-full border-0 text-base leading-4 font-bold', styles.cta)}>
                  {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {busy ? (desktop ? 'Criando conta…' : 'Criando perfil…') : idle}
                </Button>
              </div>
            </form>
            <SocialLogin variant={variant} roomy onComingSoon={onComingSoon} className={desktop ? 'pt-6' : 'pt-10'} />
          </>
        )
      }}
    </AuthLayout>
  )
}
