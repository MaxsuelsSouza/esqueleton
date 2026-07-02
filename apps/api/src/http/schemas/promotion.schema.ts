import { z } from 'zod'
import { dateSchema, hexColorSchema, idListSchema, shortText, timeSchema } from '../../shared/validation/schemas'

export const promotionSchema = z.object({
  name: shortText(120, 'Nome é obrigatório'),
  // Tipo é apenas um rótulo visual — não restringe os campos disponíveis
  type: z.enum(['percentage', 'fixed', 'buy_x_get_y', 'kit', 'custom'], {
    errorMap: () => ({ message: 'Tipo de promoção inválido' }),
  }),
  // Campos opcionais aceitam null (ou "") para LIMPAR o valor no banco.
  // undefined (campo ausente) significa "não alterar" nos updates parciais.
  discountPercent: z.number().positive('Desconto percentual deve ser maior que zero').max(100, 'Desconto não pode passar de 100%').nullish(),
  discountValue: z.number().positive('Valor de desconto deve ser maior que zero').max(99999999, 'Valor muito alto').nullish(),
  buyQuantity: z.number().int().positive('Quantidade mínima deve ser maior que zero').max(999, 'Quantidade muito alta').nullish(),
  getQuantity: z.number().int().positive('Quantidade bônus deve ser maior que zero').max(999, 'Quantidade muito alta').nullish(),
  kitPrice: z.number().positive('Preço do kit deve ser maior que zero').max(99999999, 'Preço muito alto').nullish(),
  productIds: idListSchema.default([]),
  startTime: timeSchema.or(z.literal('')).nullish().transform(v => v === '' ? null : v),
  endTime: timeSchema.or(z.literal('')).nullish().transform(v => v === '' ? null : v),
  startDate: dateSchema.or(z.literal('')).nullish().transform(v => v === '' ? null : v),
  endDate: dateSchema.or(z.literal('')).nullish().transform(v => v === '' ? null : v),
  description: shortText(1000).nullish().transform(v => v === '' ? null : v),
  // null = borda desativada (limpa o campo no banco); string = cor da borda
  color: hexColorSchema.nullable().optional(),
  active: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
})

export type PromotionInput = z.infer<typeof promotionSchema>
