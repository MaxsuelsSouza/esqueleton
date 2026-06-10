import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  // null indica categoria raiz (sem pai)
  parentId: z.string().nullable().default(null),
})

export type CategoryInput = z.infer<typeof categorySchema>
