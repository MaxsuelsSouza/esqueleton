// Validações dos dados de pedido
// Os limites de tamanho e formato impedem que requisições maliciosas gravem dados arbitrários no banco
import { z } from 'zod'
import { idSchema, phoneSchema, shortText } from '../common/validation'

const orderItemSchema = z.object({
  productId: idSchema,
  productName: shortText(200, 'Nome do produto é obrigatório'),
  quantity: z.number().int().positive().max(999, 'Quantidade muito alta'),
  unitPrice: z.number().nonnegative().max(99999999),
  lineTotal: z.number().nonnegative().max(99999999),
  promotionName: shortText(120).optional(),
})

export const createOrderSchema = z.object({
  // Número exibido na mensagem do WhatsApp — apenas letras e números
  orderNumber: z
    .string()
    .trim()
    .min(1, 'Número do pedido é obrigatório')
    .max(20, 'Número do pedido inválido')
    .regex(/^[A-Za-z0-9-]+$/, 'Número do pedido inválido'),
  customerName: shortText(120).optional(),
  customerPhone: phoneSchema.optional(),
  items: z
    .array(orderItemSchema)
    .min(1, 'O pedido deve ter pelo menos um item')
    .max(100, 'O pedido tem itens demais'),
  subtotal: z.number().nonnegative().max(99999999),
  discount: z.number().nonnegative().max(99999999).default(0),
  total: z.number().nonnegative().max(99999999),
  couponCode: z
    .string()
    .trim()
    .max(50, 'Código de cupom inválido')
    .regex(/^[A-Za-z0-9_-]*$/, 'Código de cupom inválido')
    .optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(['SOLD', 'NOT_SOLD'], {
    errorMap: () => ({ message: 'Status deve ser SOLD ou NOT_SOLD' }),
  }),
})
