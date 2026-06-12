// Validações dos dados de billing — subscribe e cancel
import { z } from 'zod'
import { idSchema } from '../common/validation'

// Corpo do POST /api/billing/subscribe
export const subscribeSchema = z.object({
  planId: idSchema,
})
