// Validações das rotas super-admin — gestão de lojas e planos da plataforma
import { z } from 'zod'
import { idSchema, slugSchema, shortText } from '../common/validation'

// Filtros da listagem de lojas (e de usuários): página, busca e status
export const listStoresQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(10000).default(1),
  search: z.string().trim().max(120).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
})

// Alterações que o super-admin pode fazer em uma loja
export const updateStoreSchema = z
  .object({
    status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
    // Troca o plano da loja diretamente (sem passar pelo checkout)
    planId: idSchema.optional(),
  })
  .refine((data) => data.status !== undefined || data.planId !== undefined, {
    message: 'Informe o status ou o plano a alterar',
  })

// Limites de um plano — null ou ausente significa ilimitado
const planLimitsSchema = z.object({
  maxProducts: z.number().int().nonnegative().max(1000000).nullish().transform((v) => v ?? null),
  maxUsers: z.number().int().positive().max(10000).nullish().transform((v) => v ?? null),
  maxOrdersPerMonth: z.number().int().nonnegative().max(1000000).nullish().transform((v) => v ?? null),
})

// Criação e edição de planos
export const planSchema = z.object({
  name: shortText(80, 'Nome do plano é obrigatório'),
  slug: slugSchema,
  limits: planLimitsSchema,
  // Preço em centavos — 0 = gratuito
  priceInCents: z.number().int('Preço deve ser um número inteiro em centavos').nonnegative('Preço não pode ser negativo').max(100000000, 'Preço muito alto'),
  billingPeriod: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  active: z.boolean().default(true),
})

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(10000).default(1),
  search: z.string().trim().max(254).optional(),
})
