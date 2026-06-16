import { z } from 'zod'
import { dateSchema, hexColorSchema, idListSchema, shortText, timeSchema } from '../../shared/validation/schemas'

export const promotionSchema = z.object({
  name: shortText(120, 'Nome é obrigatório'),
  // Tipo é apenas um rótulo visual — não restringe os campos disponíveis
  type: z.enum(['percentage', 'fixed', 'buy_x_get_y', 'kit', 'custom'], {
    errorMap: () => ({ message: 'Tipo de promoção inválido' }),
  }),
  discountPercent: z.number().positive('Desconto percentual deve ser maior que zero').max(100, 'Desconto não pode passar de 100%').nullish().transform(v => v ?? undefined),
  discountValue: z.number().positive('Valor de desconto deve ser maior que zero').max(99999999, 'Valor muito alto').nullish().transform(v => v ?? undefined),
  buyQuantity: z.number().int().positive('Quantidade mínima deve ser maior que zero').max(999, 'Quantidade muito alta').nullish().transform(v => v ?? undefined),
  getQuantity: z.number().int().positive('Quantidade bônus deve ser maior que zero').max(999, 'Quantidade muito alta').nullish().transform(v => v ?? undefined),
  kitPrice: z.number().positive('Preço do kit deve ser maior que zero').max(99999999, 'Preço muito alto').nullish().transform(v => v ?? undefined),
  productIds: idListSchema.default([]),
  startTime: timeSchema.nullish().transform(v => v || undefined),
  endTime: timeSchema.nullish().transform(v => v || undefined),
  startDate: dateSchema.nullish().transform(v => v || undefined),
  endDate: dateSchema.nullish().transform(v => v || undefined),
  description: shortText(1000).nullish().transform(v => v || undefined),
  color: hexColorSchema.nullish().transform(v => v || undefined),
  active: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
})

export type PromotionInput = z.infer<typeof promotionSchema>
