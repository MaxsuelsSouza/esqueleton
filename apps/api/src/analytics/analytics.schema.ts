// Validações dos dados de analytics
import { z } from 'zod'

export const createEventSchema = z.object({
  productId: z.string().min(1, 'ID do produto é obrigatório'),
  productName: z.string().min(1, 'Nome do produto é obrigatório'),
  // Tipo do evento
  eventType: z.enum(['CART_ADD', 'WHATSAPP_SEND', 'LINK_COPY', 'PRODUCT_VIEW', 'FAVORITE_ADD', 'FEATURED_CLICK']),
  // Promoção ativa no momento — opcional
  promotionId: z.string().optional(),
  promotionName: z.string().optional(),
  // Cupom aplicado — relevante apenas em WHATSAPP_SEND
  couponCode: z.string().optional(),
  // Seção em destaque de origem — relevante em FEATURED_CLICK e CART_ADD vindos de destaque
  featuredId: z.string().optional(),
  featuredName: z.string().optional(),
})
