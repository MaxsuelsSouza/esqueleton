import { z } from 'zod'
import { dateSchema, idListSchema, shortText, timeSchema } from '../../shared/validation/schemas'

export const featuredSchema = z.object({
  title: shortText(120, 'Título é obrigatório'),
  tag: shortText(40, 'Tag é obrigatória'),
  productIds: idListSchema.default([]),
  // Campos opcionais aceitam null (ou "") para LIMPAR o valor no banco.
  // undefined (campo ausente) significa "não alterar" nos updates parciais.
  startDate: dateSchema.or(z.literal('')).nullish().transform(v => v === '' ? null : v),
  endDate: dateSchema.or(z.literal('')).nullish().transform(v => v === '' ? null : v),
  startTime: timeSchema.or(z.literal('')).nullish().transform(v => v === '' ? null : v),
  endTime: timeSchema.or(z.literal('')).nullish().transform(v => v === '' ? null : v),
  active: z.boolean().default(false),
  carousel: z.boolean().default(false),
})

export type FeaturedInput = z.infer<typeof featuredSchema>
