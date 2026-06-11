import { z } from 'zod'
import { imageUrlSchema, idListSchema, shortText } from '../common/validation'

export const productSchema = z.object({
  brand: shortText(120).nullish().transform(v => v || undefined),
  name: shortText(200, 'Nome é obrigatório'),
  description: shortText(2000).nullish().transform(v => v || undefined),
  price: z.number().positive('Preço deve ser maior que zero').max(99999999, 'Preço muito alto'),
  originalPrice: z.number().positive('Preço original deve ser maior que zero').max(99999999, 'Preço muito alto').nullish().transform(v => v ?? undefined),
  // Aceita URL http/https ou imagem enviada pelo painel (data:image/...;base64) — bloqueia conteúdo malicioso
  imageUrl: imageUrlSchema.or(z.literal('')).or(z.null()).optional().transform(v => v || undefined),
  // Quantidade em estoque — null significa que o estoque não é controlado
  stock: z.number().int('Quantidade deve ser um número inteiro').nonnegative('Quantidade não pode ser negativa').max(999999, 'Quantidade muito alta').nullish().transform(v => v ?? null),
  // IDs das categorias às quais o produto pertence — formato validado para impedir valores arbitrários
  categoryIds: idListSchema.default([]),
})

export type ProductInput = z.infer<typeof productSchema>
