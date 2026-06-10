// Validações dos dados de pedido
import { z } from 'zod'

const orderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  lineTotal: z.number().nonnegative(),
  promotionName: z.string().optional(),
  originalPrice: z.number().optional(),
})

export const createOrderSchema = z.object({
  orderNumber: z.string().min(1, 'Número do pedido é obrigatório'),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'O pedido deve ter pelo menos um item'),
  subtotal: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  couponCode: z.string().optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(['SOLD', 'NOT_SOLD'], {
    errorMap: () => ({ message: 'Status deve ser SOLD ou NOT_SOLD' }),
  }),
})
