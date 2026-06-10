import { z } from 'zod'

export const promotionSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  // Tipo é apenas um rótulo visual — não restringe os campos disponíveis
  type: z.enum(['percentage', 'fixed', 'buy_x_get_y', 'kit', 'custom'], {
    errorMap: () => ({ message: 'Tipo de promoção inválido' }),
  }),
  discountPercent: z.number().positive('Desconto percentual deve ser maior que zero').nullish().transform(v => v ?? undefined),
  discountValue: z.number().positive('Valor de desconto deve ser maior que zero').nullish().transform(v => v ?? undefined),
  buyQuantity: z.number().int().positive('Quantidade mínima deve ser maior que zero').nullish().transform(v => v ?? undefined),
  getQuantity: z.number().int().positive('Quantidade bônus deve ser maior que zero').nullish().transform(v => v ?? undefined),
  kitPrice: z.number().positive('Preço do kit deve ser maior que zero').nullish().transform(v => v ?? undefined),
  productIds: z.array(z.string()).default([]),
  startTime: z.string().nullish().transform(v => v || undefined),
  endTime: z.string().nullish().transform(v => v || undefined),
  startDate: z.string().nullish().transform(v => v || undefined),
  endDate: z.string().nullish().transform(v => v || undefined),
  description: z.string().nullish().transform(v => v || undefined),
  color: z.string().nullish().transform(v => v || undefined),
  active: z.boolean().default(true),
})

export type PromotionInput = z.infer<typeof promotionSchema>
