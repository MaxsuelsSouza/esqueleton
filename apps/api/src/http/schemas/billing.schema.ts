// Validações dos dados de billing — subscribe, cancel e lista de faturas
import { z } from 'zod'
import { idSchema } from '../../shared/validation/schemas'

// Corpo do POST /api/billing/subscribe
export const subscribeSchema = z.object({
  planId: idSchema,
})

// Query do GET /api/billing/invoices — paginação por cursor do Stripe.
// startingAfter é o ID da última fatura já carregada (formato in_...).
export const invoicesQuerySchema = z.object({
  startingAfter: z.string().trim().max(255).optional(),
})
