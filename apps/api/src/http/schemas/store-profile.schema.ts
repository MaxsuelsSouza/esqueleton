import { z } from 'zod'
import { hexColorSchema, imageUrlSchema, phoneSchema, shortText } from '../../shared/validation/schemas'

// Configurações específicas de cada componente do page builder
const catalogComponentConfigSchema = z.object({
  searchStyle: z.enum(['full-width', 'compact']).optional(),
  featuredStyle: z.enum(['carousel', 'horizontal-strip']).optional(),
  gridColumns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
  cardStyle: z.enum(['default', 'compact']).optional(),
  lockedDisplayMode: z.enum(['grid', 'list']).optional(),
  textContent: z.string().max(500, 'Texto deve ter no máximo 500 caracteres').optional(),
  textStyle: z.enum(['normal', 'heading', 'highlight', 'banner']).optional(),
}).optional()

// IDs fixos dos componentes únicos + padrão para componentes múltiplos (text-1, text-2…)
const componentIdSchema = z.string().regex(
  /^(search|featured|filters|products|display-toggle|announcements|text-\d+)$/,
  'ID de componente inválido',
)

// Posição de um componente no grid de 12 colunas
const catalogLayoutItemSchema = z.object({
  i: componentIdSchema,
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(20),
  config: catalogComponentConfigSchema,
})

// Layout do catálogo — array de componentes posicionados no grid.
// null/undefined = layout padrão (catálogo original). O transform converte null em undefined
// para compatibilidade com o Prisma JSON field.
const catalogLayoutSchema = z.object({
  items: z.array(catalogLayoutItemSchema).max(10, 'Máximo de 10 componentes'),
}).nullish().transform(v => v ?? undefined)

export const storeProfileSchema = z.object({
  storeName: shortText(120, 'Nome da loja é obrigatório'),
  address: shortText(300).nullish().transform(v => v || undefined),
  whatsapp: phoneSchema.nullish().transform(v => v || undefined),
  instagram: shortText(100).nullish().transform(v => v || undefined),
  // Aceita URL http/https ou logo enviada pelo painel (data:image/...;base64) — bloqueia conteúdo malicioso
  logoUrl: imageUrlSchema.or(z.literal('')).or(z.null()).optional().transform(v => v || undefined),
  themeColor: hexColorSchema.default('#000000'),
  // Mensagens da barra de anúncios — limitadas em quantidade e tamanho
  announcements: z.array(shortText(200)).max(10, 'Máximo de 10 anúncios').default([]),
  // Layout visual do catálogo público — null ou ausente = layout padrão
  catalogLayout: catalogLayoutSchema,
})
