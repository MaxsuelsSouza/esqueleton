import { z } from 'zod'

export const featuredSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  tag: z.string().min(1, 'Tag é obrigatória'),
  productIds: z.array(z.string()).default([]),
  startDate: z.string().nullish().transform(v => v || undefined),
  endDate: z.string().nullish().transform(v => v || undefined),
  startTime: z.string().nullish().transform(v => v || undefined),
  endTime: z.string().nullish().transform(v => v || undefined),
  active: z.boolean().default(false),
})

export type FeaturedInput = z.infer<typeof featuredSchema>
