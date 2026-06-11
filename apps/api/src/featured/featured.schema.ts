import { z } from 'zod'
import { dateSchema, idListSchema, shortText, timeSchema } from '../common/validation'

export const featuredSchema = z.object({
  title: shortText(120, 'Título é obrigatório'),
  tag: shortText(40, 'Tag é obrigatória'),
  productIds: idListSchema.default([]),
  startDate: dateSchema.nullish().transform(v => v || undefined),
  endDate: dateSchema.nullish().transform(v => v || undefined),
  startTime: timeSchema.nullish().transform(v => v || undefined),
  endTime: timeSchema.nullish().transform(v => v || undefined),
  active: z.boolean().default(false),
})

export type FeaturedInput = z.infer<typeof featuredSchema>
