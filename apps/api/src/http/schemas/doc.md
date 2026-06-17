# http/schemas/ — Validações Zod de entrada

Schemas Zod que validam body, params e query de cada feature. Importados pelas rotas correspondentes.

## Arquivos (14)

| Schema | Valida | Usado em |
|--------|--------|----------|
| `catalog.schema.ts` | `productSchema` — nome, preço, imagem, categorias, variantes, características | catalog.routes |
| `category.schema.ts` | `categorySchema` — nome, parentId, cor, ícone | category.routes |
| `coupon.schema.ts` | `couponSchema` — código, desconto, tipo, datas, limite de usos, productIds | coupon.routes |
| `promotion.schema.ts` | `promotionSchema` — nome, tipo, desconto, horários, datas, productIds | promotion.routes |
| `featured.schema.ts` | `featuredSchema` — título, descrição, productIds, datas, horários | featured.routes |
| `order.schema.ts` | `orderSchema` — itens, totais, cupom, dados do cliente | order.routes |
| `customer.schema.ts` | `customerSchema` — nome, telefone | customer.routes |
| `store-profile.schema.ts` | `storeProfileSchema` — nome, descrição, logo, WhatsApp, horários, cores | store-profile.routes |
| `billing.schema.ts` | `subscribeSchema`, `cancelSchema` — planId | billing.routes |
| `analytics.schema.ts` | `eventSchema` — tipo de evento, productId, metadata | analytics.routes |
| `notification.schema.ts` | `notificationUpdateSchema` — status da notificação | notification.routes |
| `session.schema.ts` | `cartSchema`, `favoritesSchema` — itens da sacola e IDs favoritos | session.routes |
| `password-reset.schema.ts` | `forgotPasswordSchema`, `resetPasswordSchema` — email, token, nova senha | password-reset.routes |
| `super.schema.ts` | `updateStoreSchema`, `planSchema` — dados de gestão da plataforma | super routes |

## Padrão de um schema

```typescript
import { z } from 'zod'
import { shortText, imageUrlSchema, idListSchema } from '../../shared/validation/schemas'

export const featureSchema = z.object({
  // Campo obrigatório com mensagem em português
  name: shortText(200, 'Nome é obrigatório'),

  // Campo opcional — transforma null/empty em undefined para o Prisma
  description: shortText(2000).nullish().transform(v => v || undefined),

  // Imagem (URL ou base64)
  imageUrl: imageUrlSchema.or(z.literal('')).or(z.null()).optional().transform(v => v || undefined),

  // Número com validação
  price: z.number().positive('Preço deve ser maior que zero').max(99999999),

  // Lista de IDs com limite
  categoryIds: idListSchema.default([]),
})

export type FeatureInput = z.infer<typeof featureSchema>
```

## Regras

- Sempre use validadores de `shared/validation/schemas.ts` como base (idSchema, shortText, imageUrlSchema, etc.)
- Mensagens de erro em **português**
- `.nullish().transform(v => v || undefined)` para campos opcionais
- `.default([])` para arrays opcionais
- Exporte o tipo `z.infer<typeof schema>` quando útil
- Schemas inline pequenos (email, password) podem ficar no arquivo de rotas
