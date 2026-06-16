import { z } from 'zod'
import { idSchema, shortText } from '../../shared/validation/schemas'

export const categorySchema = z.object({
  name: shortText(120, 'Nome é obrigatório'),
  // null indica categoria raiz (sem pai) — quando informado, o formato do ID é validado
  parentId: idSchema.nullable().default(null),
})

export type CategoryInput = z.infer<typeof categorySchema>
