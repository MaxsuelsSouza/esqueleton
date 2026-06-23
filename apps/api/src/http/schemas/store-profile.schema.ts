import { z } from 'zod'
import { hexColorSchema, imageUrlSchema, phoneSchema, shortText } from '../../shared/validation/schemas'

export const storeProfileSchema = z.object({
  storeName: shortText(120, 'Nome da loja é obrigatório'),
  address: shortText(300).nullish().transform(v => v || undefined),
  whatsapp: phoneSchema.min(1, 'WhatsApp é obrigatório — seus clientes enviam pedidos por ele'),
  instagram: shortText(100).nullish().transform(v => v || undefined),
  // Aceita URL http/https ou logo enviada pelo painel (data:image/...;base64) — bloqueia conteúdo malicioso
  logoUrl: imageUrlSchema.or(z.literal('')).or(z.null()).optional().transform(v => v || undefined),
  themeColor: hexColorSchema.default('#000000'),
  // Mensagens da barra de anúncios — limitadas em quantidade e tamanho
  announcements: z.array(shortText(200)).max(10, 'Máximo de 10 anúncios').default([]),
})
