import { z } from 'zod'
import { idSchema, isoDateSchema, moneySchema } from './common'
import { orderStatusSchema } from './commerce'
import { editionSchema } from './nft'

/**
 * Realtime envelope (RT-04): stable identity (`eventId`), affected resource and the
 * resource version after the change. Clients drop duplicates and stale versions (RT-05).
 */
const envelope = <T extends string, R extends string, D extends z.ZodType>(type: T, resource: R, data: D) =>
  z.object({
    eventId: z.string().min(1),
    type: z.literal(type),
    resource: z.object({ type: z.literal(resource), id: idSchema }),
    version: z.number().int().nonnegative(),
    occurredAt: isoDateSchema,
    data,
  })

export const nftUpdatedEventSchema = envelope(
  'nft.updated',
  'nft',
  z.object({
    nftId: idSchema,
    price: moneySchema,
    compareAtPrice: moneySchema.nullable(),
    available: z.number().int().nonnegative(),
    editions: z.array(editionSchema),
  }),
)
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = envelope(
  'order.updated',
  'order',
  z.object({
    orderId: idSchema,
    status: orderStatusSchema,
    txHash: z.string().nullable(),
    declineReason: z.string().nullable(),
  }),
)
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export const realtimeEventSchema = z.discriminatedUnion('type', [nftUpdatedEventSchema, orderUpdatedEventSchema])
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>
export type RealtimeEventType = RealtimeEvent['type']

export const REALTIME_EVENT_TYPES = ['nft.updated', 'order.updated'] as const satisfies readonly RealtimeEventType[]
