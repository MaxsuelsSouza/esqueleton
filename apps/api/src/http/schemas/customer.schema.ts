// Validações dos dados do cliente coletados na sacola
import { z } from 'zod'
import { phoneSchema, shortText } from '../../shared/validation/schemas'

export const upsertCustomerSchema = z.object({
  name: shortText(120, 'Nome deve ter pelo menos 2 caracteres').pipe(
    z.string().min(2, 'Nome deve ter pelo menos 2 caracteres')
  ),
  // Aceita apenas dígitos, espaços, parênteses, "+" e "-" — bloqueia textos arbitrários no campo de telefone
  phone: phoneSchema,
})

// Correção de cadastro pelo painel (art. 18, III da LGPD) — todos os campos são opcionais
export const updateCustomerSchema = upsertCustomerSchema.partial()

// Opções da exclusão de cliente — anonimizar também os pedidos do telefone dele
export const deleteCustomerQuerySchema = z.object({
  anonimizarPedidos: z.enum(['true', 'false']).optional(),
})
