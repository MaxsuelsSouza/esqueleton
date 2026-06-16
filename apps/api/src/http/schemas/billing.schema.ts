// Validações dos dados de billing — subscribe e cancel
import { z } from 'zod'
import { idSchema } from '../../shared/validation/schemas'

// Corpo do POST /api/billing/subscribe
export const subscribeSchema = z.object({
  planId: idSchema,
})
