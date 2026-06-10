import { z } from 'zod'

export const storeProfileSchema = z.object({
  storeName: z.string().min(1, 'Nome da loja é obrigatório'),
  address: z.string().nullish().transform(v => v || undefined),
  whatsapp: z.string().nullish().transform(v => v || undefined),
  instagram: z.string().nullish().transform(v => v || undefined),
  logoUrl: z.string().url('URL da logo inválida').or(z.literal('')).or(z.null()).optional().transform(v => v || undefined),
  themeColor: z.string().default('#000000'),
  announcements: z.array(z.string()).default([]),
})
