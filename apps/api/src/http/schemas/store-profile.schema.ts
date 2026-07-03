import { z } from 'zod'
import { hexColorSchema, imageUrlSchema, phoneSchema, shortText } from '../../shared/validation/schemas'

export const storeProfileSchema = z.object({
  storeName: shortText(120, 'Nome da loja é obrigatório'),
  // Campos opcionais aceitam null (ou "") para LIMPAR o valor no banco.
  // undefined (campo ausente) significa "não alterar" nos updates parciais.
  address: shortText(300).nullish().transform(v => v === '' ? null : v),
  whatsapp: phoneSchema,
  instagram: shortText(100).nullish().transform(v => v === '' ? null : v),
  // Aceita URL http/https ou logo enviada pelo painel (data:image/...;base64) — bloqueia conteúdo malicioso
  logoUrl: imageUrlSchema.or(z.literal('')).nullish().transform(v => v === '' ? null : v),
  themeColor: hexColorSchema.default('#000000'),
  // Mensagens da barra de anúncios — limitadas em quantidade e tamanho
  announcements: z.array(shortText(200)).max(10, 'Máximo de 10 anúncios').default([]),
})
