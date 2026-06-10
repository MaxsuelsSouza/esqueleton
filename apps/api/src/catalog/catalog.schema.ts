import { z } from 'zod'

export const productSchema = z.object({
  brand: z.string().nullish().transform(v => v || undefined),
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().nullish().transform(v => v || undefined),
  price: z.number().positive('Preço deve ser maior que zero'),
  originalPrice: z.number().positive('Preço original deve ser maior que zero').nullish().transform(v => v ?? undefined),
  imageUrl: z.string().url('URL da imagem inválida').or(z.literal('')).or(z.null()).optional().transform(v => v || undefined),
  // Quantidade em estoque — null significa que o estoque não é controlado
  stock: z.number().int('Quantidade deve ser um número inteiro').nonnegative('Quantidade não pode ser negativa').nullish().transform(v => v ?? null),
  // IDs das categorias às quais o produto pertence
  categoryIds: z.array(z.string()).default([]),
})

export type ProductInput = z.infer<typeof productSchema>
