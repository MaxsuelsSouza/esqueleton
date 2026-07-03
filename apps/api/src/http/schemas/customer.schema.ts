// Validações dos dados do cliente coletados na sacola
import { z } from 'zod'
import { phoneSchema, shortText } from '../../shared/validation/schemas'

// Telefone brasileiro completo: 55 + DDD (2 dígitos) + número (8 ou 9 dígitos).
// Formato estrito (LGPD, Fase 4.6): a rota é pública, e número incompleto ou
// inventado vira dado-lixo gravado em nome de terceiros.
const telefoneBrasileiroCompleto = phoneSchema.refine(
  (telefoneNormalizado) => /^55\d{10,11}$/.test(telefoneNormalizado),
  'Telefone inválido — informe o DDD e o número completo',
)

export const upsertCustomerSchema = z.object({
  name: shortText(120, 'Nome deve ter pelo menos 2 caracteres').pipe(
    z.string().min(2, 'Nome deve ter pelo menos 2 caracteres')
  ),
  // Aceita formatação livre no campo, mas o número precisa ser completo (DDD + número)
  phone: telefoneBrasileiroCompleto,
})

// Correção de cadastro pelo painel (art. 18, III da LGPD) — todos os campos são opcionais
export const updateCustomerSchema = upsertCustomerSchema.partial()

// Opções da exclusão de cliente — anonimizar também os pedidos do telefone dele
export const deleteCustomerQuerySchema = z.object({
  anonimizarPedidos: z.enum(['true', 'false']).optional(),
})
