// Validações dos dados de sacola e favoritos dos visitantes
import { z } from 'zod'
import { idSchema } from '../common/validation'

// Token de sessão do visitante — UUID v4 gerado pelo navegador
export const sessionTokenSchema = z
  .string()
  .min(10, 'Token de sessão inválido')
  .max(128, 'Token de sessão inválido')
  .regex(/^[A-Za-z0-9_-]+$/, 'Token de sessão inválido')

// Headers comuns a todas as rotas de sessão
export const sessionHeadersSchema = z.object({
  'x-session-token': sessionTokenSchema,
})

// Item da sacola enviado pelo frontend
export const cartItemSchema = z.object({
  productId: idSchema,
  quantity: z.number().int().min(1, 'Quantidade mínima é 1').max(999, 'Quantidade máxima é 999'),
  promotionId: z.string().max(64).optional(),
  promotionName: z.string().max(200).optional(),
  // Opções da variante selecionada (ex: { Cor: "Preto", Armazenamento: "1TB" })
  selectedOptions: z.record(z.string().max(100), z.string().max(200)).optional(),
  // ID da variante selecionada — usado para buscar o preço correto na sacola
  variantId: z.string().max(64).optional(),
})

// Corpo do PUT /cart — lista completa de itens
export const cartBodySchema = z.object({
  items: z.array(cartItemSchema).max(200, 'Limite de 200 itens na sacola'),
})

// Corpo do PUT /favorites — lista completa de IDs
export const favoritesBodySchema = z.object({
  productIds: z.array(idSchema).max(500, 'Limite de 500 favoritos'),
})
