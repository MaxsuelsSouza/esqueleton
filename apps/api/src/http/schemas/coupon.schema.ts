import { z } from 'zod'
import { dateSchema, idListSchema, shortText } from '../../shared/validation/schemas'

export const couponSchema = z.object({
  // Código que o cliente digita — apenas letras, números, hífen e underline
  code: z
    .string()
    .trim()
    .min(1, 'Código é obrigatório')
    .max(50, 'Código muito longo')
    .regex(/^[A-Za-z0-9_-]+$/, 'Código pode ter apenas letras, números, hífen e underline')
    .toUpperCase(),
  // Campos opcionais aceitam null (ou "") para LIMPAR o valor no banco.
  // undefined (campo ausente) significa "não alterar" nos updates parciais.
  description: shortText(500).nullish().transform(v => v === '' ? null : v),
  discountType: z.enum(['percentage', 'fixed'], {
    errorMap: () => ({ message: 'Tipo de desconto inválido' }),
  }),
  discountPercent: z.number().positive('Desconto percentual deve ser maior que zero').max(100, 'Desconto não pode passar de 100%').nullish(),
  discountValue: z.number().positive('Valor de desconto deve ser maior que zero').max(99999999, 'Valor muito alto').nullish(),
  minimumOrderValue: z.number().nonnegative('Valor mínimo do pedido não pode ser negativo').max(99999999, 'Valor muito alto').nullish(),
  maxUses: z.number().int().positive('Limite de usos deve ser maior que zero').max(1000000, 'Limite muito alto').nullish(),
  maxUsesPerUser: z.number().int().positive('Limite por usuário deve ser maior que zero').max(1000000, 'Limite muito alto').nullish(),
  productIds: idListSchema.default([]),
  startDate: dateSchema.or(z.literal('')).nullish().transform(v => v === '' ? null : v),
  endDate: dateSchema.or(z.literal('')).nullish().transform(v => v === '' ? null : v),
  active: z.boolean().default(true),
})

export type CouponInput = z.infer<typeof couponSchema>
