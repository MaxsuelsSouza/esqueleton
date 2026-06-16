import { z } from 'zod'
import { imageUrlSchema, idListSchema, shortText } from '../../shared/validation/schemas'

// Característica do produto — par nome/valor (ex: "Tamanho" → "100ml")
const characteristicSchema = z.object({
  name: shortText(100, 'Nome da característica é obrigatório'),
  value: shortText(500, 'Valor da característica é obrigatório'),
})

export const productSchema = z.object({
  brand: shortText(120).nullish().transform(v => v || undefined),
  name: shortText(200, 'Nome é obrigatório'),
  description: shortText(2000).nullish().transform(v => v || undefined),
  price: z.number().positive('Preço deve ser maior que zero').max(99999999, 'Preço muito alto'),
  // Aceita URL http/https ou imagem enviada pelo painel (data:image/...;base64) — bloqueia conteúdo malicioso
  imageUrl: imageUrlSchema.or(z.literal('')).or(z.null()).optional().transform(v => v || undefined),
  // Fotos adicionais do produto (galeria) — até 10 imagens
  images: z.array(imageUrlSchema).max(10, 'Máximo de 10 fotos adicionais').default([]),
  // IDs das categorias às quais o produto pertence — formato validado para impedir valores arbitrários
  categoryIds: idListSchema.default([]),
  // Características do produto — lista de pares nome/valor, limitada a 50 itens
  characteristics: z.array(characteristicSchema).max(50, 'Máximo de 50 características').default([]).transform(v => v.length > 0 ? v : undefined),
  // Variantes do produto — cada uma com opções, preço e imagem opcional
  variants: z.array(z.object({
    id: z.string().optional(),
    options: z.record(z.string(), shortText(200)),
    price: z.number().positive('Preço da variante deve ser maior que zero').max(99999999, 'Preço muito alto'),
    imageUrl: imageUrlSchema.or(z.literal('')).or(z.null()).optional().transform(v => v || undefined),
    active: z.boolean().default(true),
  })).max(100, 'Máximo de 100 variantes').default([]),
})

export type ProductInput = z.infer<typeof productSchema>
