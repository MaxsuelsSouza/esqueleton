// Validações das rotas super-admin — gestão de lojas e planos da plataforma
import { z } from 'zod'
import { idSchema, slugSchema, shortText, phoneSchema } from '../../shared/validation/schemas'
import { isSenhaMuitoComum } from '../../shared/validation/weak-passwords'

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

// Criação de loja pelo super-admin (venda presencial) — loja, dono e plano em um passo só.
// A senha é temporária: o dono é obrigado a trocá-la no primeiro acesso.
export const createStoreSchema = z.object({
  storeName: shortText(80, 'Nome da loja é obrigatório'),
  storeSlug: slugSchema,
  whatsapp: phoneSchema,
  email: z.string().email('Email inválido').max(254, 'Email muito longo'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(72, 'Senha muito longa')
    .refine(
      (senha) => !isSenhaMuitoComum(senha),
      'Senha muito comum — escolha uma senha mais difícil de adivinhar',
    ),
  planId: idSchema,
})

// Geração de link de pagamento para uma loja que já existe —
// o cliente abre o link, cadastra o cartão e o webhook ativa a assinatura
export const paymentLinkSchema = z.object({
  planId: idSchema,
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
  // ONLINE = autoatendimento (cobrança recorrente desde o cadastro)
  // PRESENCIAL = vendido por um representante — cobra implantação única (setupFeeInCents) antes da recorrência
  salesModality: z.enum(['ONLINE', 'PRESENCIAL']).default('ONLINE'),
  // Taxa única de implantação em centavos, cobrada manualmente/fora do sistema — 0 = sem taxa
  setupFeeInCents: z.number().int('Taxa de implantação deve ser um número inteiro em centavos').nonnegative('Taxa de implantação não pode ser negativa').max(100000000, 'Taxa muito alta').default(0),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  active: z.boolean().default(true),
})

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(10000).default(1),
  search: z.string().trim().max(254).optional(),
})
