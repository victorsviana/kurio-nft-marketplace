import { z } from 'zod'
import { idSchema, isoDateSchema } from './common'

/* Field rules are shared by the forms (client validation) and the MSW handlers (server validation). */
export const displayNameField = z
  .string({ error: 'Informe seu nome' })
  .trim()
  .min(2, { error: 'O nome precisa ter pelo menos 2 caracteres' })
  .max(40, { error: 'O nome pode ter no máximo 40 caracteres' })

export const usernameField = z
  .string({ error: 'Informe um nome de usuário' })
  .trim()
  .min(3, { error: 'O usuário precisa ter pelo menos 3 caracteres' })
  .max(20, { error: 'O usuário pode ter no máximo 20 caracteres' })
  .regex(/^[a-z0-9_.]+$/, { error: 'Use apenas letras minúsculas, números, ponto ou _' })

export const emailField = z
  .string({ error: 'Informe seu e-mail' })
  .trim()
  .toLowerCase()
  .min(1, { error: 'Informe seu e-mail' })
  .pipe(z.email({ error: 'Informe um e-mail válido' }))

export const passwordField = z
  .string({ error: 'Informe uma senha' })
  .min(8, { error: 'A senha precisa ter pelo menos 8 caracteres' })
  .max(64, { error: 'A senha pode ter no máximo 64 caracteres' })
  .regex(/[A-Za-z]/, { error: 'A senha precisa ter pelo menos uma letra' })
  .regex(/\d/, { error: 'A senha precisa ter pelo menos um número' })

export const userSchema = z.object({
  id: idSchema,
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  token: z.string().min(1),
  expiresAt: isoDateSchema,
})
export type Session = z.infer<typeof sessionSchema>

export const authResponseSchema = z.object({ user: userSchema, session: sessionSchema })
export type AuthResponse = z.infer<typeof authResponseSchema>

export const registerInputSchema = z.object({
  displayName: displayNameField,
  username: usernameField,
  email: emailField,
  password: passwordField,
})
export type RegisterInput = z.input<typeof registerInputSchema>

export const loginInputSchema = z.object({
  email: emailField,
  password: z.string({ error: 'Informe sua senha' }).min(1, { error: 'Informe sua senha' }),
})
export type LoginInput = z.input<typeof loginInputSchema>
