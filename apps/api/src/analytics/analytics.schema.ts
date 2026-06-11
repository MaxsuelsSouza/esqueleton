// Validações dos dados de analytics
// Os limites de tamanho e formato impedem que requisições maliciosas gravem dados arbitrários no banco
import { z } from 'zod'
import { idSchema, shortText } from '../common/validation'

export const createEventSchema = z.object({
  productId: idSchema,
  productName: shortText(200, 'Nome do produto é obrigatório'),
  // Tipo do evento
  eventType: z.enum(['CART_ADD', 'WHATSAPP_SEND', 'LINK_COPY', 'PRODUCT_VIEW', 'FAVORITE_ADD', 'FEATURED_CLICK']),
  // Promoção ativa no momento — opcional
  promotionId: idSchema.optional(),
  promotionName: shortText(120).optional(),
  // Cupom aplicado — relevante apenas em WHATSAPP_SEND
  couponCode: shortText(50).optional(),
  // Seção em destaque de origem — relevante em FEATURED_CLICK e CART_ADD vindos de destaque
  featuredId: idSchema.optional(),
  featuredName: shortText(120).optional(),
})
