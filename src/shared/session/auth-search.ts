import { z } from 'zod'

/** Search params of /login and /signup: where to return after auth and why we got here. */
export const authSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  reason: z.enum(['expired']).optional().catch(undefined),
})
export type AuthSearch = z.output<typeof authSearchSchema>
