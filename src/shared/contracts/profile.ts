import { z } from 'zod'
import { displayNameField, emailField, passwordField, usernameField } from './auth'
import { idSchema, isoDateSchema } from './common'

export const profileSchema = z.object({
  id: idSchema,
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  ensName: z.string(),
  walletNickname: z.string(),
  avatarUrl: z.string().nullable(),
  updatedAt: isoDateSchema,
})
export type Profile = z.infer<typeof profileSchema>

export const profileInputSchema = z.object({
  displayName: displayNameField,
  username: usernameField,
  email: emailField,
  ensName: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[a-z0-9-]+\.eth$/.test(v), { error: 'Use um nome ENS como colecionador.eth' }),
  walletNickname: z.string().trim().max(32, { error: 'Use no máximo 32 caracteres' }),
})
export type ProfileInput = z.input<typeof profileInputSchema>

/** ~450KB of base64; the client resizes avatars before upload (localStorage budget). */
export const avatarInputSchema = z.object({
  dataUrl: z
    .string()
    .max(600_000, { error: "Imagem muito grande (máx. ~450 KB)" })
    .regex(/^data:image\/(png|jpeg|webp);base64,/, { error: 'Use uma imagem PNG, JPEG ou WebP' }),
})

export const passwordChangeInputSchema = z.object({
  currentPassword: z.string().min(1, { error: 'Informe a senha atual' }),
  newPassword: passwordField,
})
export type PasswordChangeInput = z.infer<typeof passwordChangeInputSchema>
