# domain/ — Lógica de negócio

Camada de negócio pura. **Não conhece HTTP, Fastify, request nem reply.** Recebe dados já validados e o `PrismaClient`; retorna resultados ou lança erros.

## Regra de dependência

`domain/` importa de `shared/` (ex: `TRIAL_MS` de `billing/trial.ts`). **Nunca importa de `http/`** (rotas, schemas, plugins).

## Subpastas

| Pasta | O que faz |
|-------|-----------|
| [`identity/`](identity/doc.md) | Criação de lojas/usuários e guards de permissão |
| [`catalog/`](catalog/doc.md) | Listagem paginada de produtos e exclusão recursiva de categorias |
| [`pricing/`](pricing/doc.md) | Validação de cupons (ativo, datas, limite de usos) |
| [`order/`](order/doc.md) | Validação aritmética de pedidos (anti-manipulação) |
| [`store/`](store/doc.md) | Disponibilidade da loja (trial ou assinatura ativa) |
| [`billing/`](billing/doc.md) | Período de teste + integração MercadoPago |
| [`analytics/`](analytics/doc.md) | Agregação de métricas do dashboard |
| [`notification/`](notification/doc.md) | Detecção de promoções/cupons/destaques expirados |
| [`session/`](session/doc.md) | Armazenamento de sacola e favoritos (Redis ou memória) |

## Padrão de um service

```typescript
import type { PrismaClient } from '@prisma/client'

// 1. Tipos locais (não exportados se só usados aqui)
type Params = { ... }

// 2. Constantes reutilizáveis (includes, page sizes)
export const FEATURE_INCLUDE = { ... } as const

// 3. Funções de transformação (banco → resposta)
export function toFeatureResponse(item: DbType) { ... }

// 4. Funções de negócio (recebem prisma + dados validados)
export async function listarFeatures(prisma: PrismaClient, storeId: string, query: Query) { ... }

// 5. Funções puras (sem banco)
export function validateFeatureRule(data: Input): boolean { ... }
```

**Nunca:** acessar `request`, `reply`, `app`, headers, JWT ou qualquer coisa HTTP.
