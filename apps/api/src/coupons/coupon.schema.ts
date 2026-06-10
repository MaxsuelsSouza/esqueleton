import { z } from 'zod'

export const couponSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório').toUpperCase(),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed'], {
    errorMap: () => ({ message: 'Tipo de desconto inválido' }),
  }),
  discountPercent: z.number().positive('Desconto percentual deve ser maior que zero').nullish().transform(v => v ?? undefined),
  discountValue: z.number().positive('Valor de desconto deve ser maior que zero').nullish().transform(v => v ?? undefined),
  minimumOrderValue: z.number().nonnegative('Valor mínimo do pedido não pode ser negativo').nullish().transform(v => v ?? undefined),
  maxUses: z.number().int().positive('Limite de usos deve ser maior que zero').nullish().transform(v => v ?? undefined),
  maxUsesPerUser: z.number().int().positive('Limite por usuário deve ser maior que zero').nullish().transform(v => v ?? undefined),
  productIds: z.array(z.string()).default([]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  active: z.boolean().default(true),
})

export type CouponInput = z.infer<typeof couponSchema>
