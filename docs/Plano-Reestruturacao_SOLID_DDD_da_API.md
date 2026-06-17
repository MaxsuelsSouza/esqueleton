Plano: Reestruturação SOLID + DDD da API

     Contexto

     A API (apps/api/src/) tem ~4.500 linhas em 53 arquivos organizados de forma flat por feature. O código funciona bem, mas
      viola princípios SOLID: lógica de negócio misturada com HTTP handlers, app.ts com 30+ imports que precisa ser editado
     para cada nova feature, e módulos com múltiplas responsabilidades (ex: analytics.routes.ts com 270 linhas de agregação
     pura dentro do handler).

     A meta é reorganizar em camadas DDD (shared → domain → http) preservando todos os 45+ testes e o sistema de
     plugins/decorations do Fastify.

     Decisões de Design

     1. SEM repository interfaces — Prisma é o repositório; o tenant guard já é a fronteira de acesso. Services recebem
     PrismaClient como parâmetro (DI sem cerimônia).
     2. SEM entity/value-object classes — tipos Prisma são as entities; Zod schemas são a validação.
     3. SEM path aliases — tsconfig não tem e não vamos adicionar. Imports relativos ficam 1 nível mais profundos (3 níveis
     max).
     4. SEM auto-registration — barrels manuais por bounded context reduzem imports de 30+ para ~10 no app.ts.
     5. SEM service para rotas finas — customers (8 linhas), users (8 linhas), store-profile (15 linhas), promotions (20
     linhas) ficam como estão.
     6. Manter dual-export pattern — xxxPublicRoutes + xxxAdminRoutes no mesmo arquivo, pois compartilham helpers.

     Fases de Implementação

     ---
     Fase 0: Preparação (risco zero)

     1. Rodar pnpm test e pnpm lint para confirmar baseline verde
     2. Criar estrutura de pastas vazias:
     src/shared/database/
     src/shared/email/templates/
     src/shared/cache/
     src/shared/validation/
     src/shared/errors/
     src/domain/catalog/services/
     src/domain/pricing/services/
     src/domain/order/services/
     src/domain/identity/services/
     src/domain/identity/guards/
     src/domain/store/services/
     src/domain/billing/services/
     src/domain/billing/integrations/
     src/domain/analytics/services/
     src/domain/notification/services/
     src/domain/session/store/
     src/http/plugins/
     src/http/routes/auth/
     src/http/routes/catalog/
     src/http/routes/pricing/
     src/http/routes/order/
     src/http/routes/billing/
     src/http/routes/analytics/
     src/http/routes/notification/
     src/http/routes/admin/
     src/http/routes/super/
     src/http/routes/webhooks/
     src/http/routes/session/
     src/http/schemas/

     ---
     Fase 1: Mover infraestrutura compartilhada para shared/

     Estratégia: mover arquivo → criar re-export no local antigo → rodar testes → atualizar importadores → remover re-export.

     Passo 1a: common/validation.ts → shared/validation/schemas.ts
     - Mover arquivo
     - Re-export: src/common/validation.ts → export * from '../shared/validation/schemas'
     - 15+ arquivos importam daqui — re-export evita quebra
     - Atualizar importadores depois, remover re-export

     Passo 1b: common/rate-limit-redis.ts → shared/cache/rate-limit-redis.ts
     - Só app.ts importa — mover e atualizar import direto

     Passo 1c: database/ → shared/database/
     - Mover prisma.plugin.ts e tenant-guard.ts
     - Re-export temporário em src/database/
     - Importadores: app.ts, tenant-guard.test.ts

     Passo 1d: email/ → shared/email/
     - Mover resend.plugin.ts e templates.ts
     - Re-export temporário em src/email/
     - Importadores: app.ts, auth.routes.ts, password-reset.routes.ts, email-verification.routes.ts

     Passo 1e: Extrair error handler de app.ts → shared/errors/error-handler.ts
     - Extrair linhas 155-165 de app.ts (callback do setErrorHandler) para:
     // shared/errors/error-handler.ts
     export function registerErrorHandler(app: FastifyInstance): void { ... }
     - app.ts importa e chama registerErrorHandler(app)

     Passo 1f: Atualizar todos os imports para caminhos diretos e remover re-exports

     Arquivos modificados nesta fase:
     - src/app.ts
     - src/shared/database/prisma.plugin.ts (import interno de tenant-guard: ./tenant-guard)
     - src/shared/errors/error-handler.ts (novo)
     - Todos os arquivos que importam de ../common/validation, ../database/..., ../email/...

     ---
     Fase 2: Extrair services do domínio (lógica de negócio)

     Extrair lógica pura dos route handlers para funções independentes. Cada service recebe PrismaClient + storeId e retorna
     dados — sem HTTP.

     Passo 2a (P0): domain/analytics/services/analytics.service.ts — MAIOR GANHO
     - Extrair linhas 32-329 de analytics.routes.ts (270 linhas de agregação pura):
     export async function computeAnalyticsSummary(
       prisma: PrismaClient, storeId: string
     ): Promise<AnalyticsSummary> { ... }
     - Mover os tipos ProductEntry, PromotionEntry, FeaturedEntry, CouponEntry para o service
     - Route handler fica: return computeAnalyticsSummary(app.prisma, request.user.storeId)
     - analytics.routes.ts cai de 332 → ~30 linhas

     Passo 2b (P1): domain/catalog/services/product.service.ts
     - Extrair de catalog.routes.ts:
       - PRODUCT_INCLUDE (constante, linhas 11-22)
       - toProductResponse() (transformação pura, linhas 25-43)
       - listarProdutos() (filtros + paginação, linhas 59-133)
     export const PRODUCT_INCLUDE = { ... }
     export function toProductResponse(product: RawProduct): ProductResponse { ... }
     export async function listarProdutos(
       prisma: PrismaClient, storeId: string, query: ListQuery
     ): Promise<PaginatedResult> { ... }
     - catalog.routes.ts cai de 312 → ~180 linhas (CRUD admin continua na rota)

     Passo 2c (P1): domain/catalog/services/category.service.ts
     - Extrair collectDescendantIds() (BFS, linhas 99-117 de category.routes.ts):
     export async function collectDescendantIds(
       prisma: PrismaClient, rootId: string, storeId: string
     ): Promise<string[]> { ... }

     Passo 2d (P1): domain/notification/services/notification.service.ts
     - Extrair lógica de expiração (linhas 55-120 de notification.routes.ts):
     export async function checkExpiredEntities(
       prisma: PrismaClient, storeId: string
     ): Promise<number> { ... }
     - Inclui filtros de promoções, cupons e destaques expirados + createMany

     Passo 2e (P2): domain/order/services/order.service.ts
     - Extrair validação aritmética (linhas 22-31 de order.routes.ts):
     export function validateOrderArithmetic(data: {
       items: Array<{ lineTotal: number; unitPrice: number; quantity: number }>;
       subtotal: number; discount: number; total: number;
     }): boolean { ... }
     - Função pura, sem Prisma, sem async — fácil de testar unitariamente

     Passo 2f (P2): domain/pricing/services/coupon.service.ts
     - Extrair validação de cupom (linhas 35-44 de coupon.routes.ts):
     export function isCouponUsable(coupon: {
       active: boolean; startDate?: string | null; endDate?: string | null;
       maxUses: number | null; usedCount: number;
     }): { valid: boolean; reason?: string } { ... }

     Passo 2g (P2): domain/identity/services/auth.service.ts
     - Extrair transação de criação de loja (linhas 92-150 de auth.routes.ts):
     export async function registerStore(
       prisma: PrismaClient,
       params: { email: string; hashedPassword: string; storeName: string; storeSlug: string }
     ): Promise<{ store: Store; user: User }> { ... }
     - Extrair criação de staff (linhas 70-88):
     export async function registerStaff(
       prisma: PrismaClient,
       params: { email: string; hashedPassword: string; storeId: string }
     ): Promise<User> { ... }
     - Login permanece no handler (acoplado a JWT signing + rate limiting)

     Passo 2h (P2): domain/store/services/store-availability.service.ts
     - Extrair regra de disponibilidade de store-context.plugin.ts (linhas 63-77):
     export async function isStoreAvailable(
       prisma: PrismaClient,
       store: { id: string; createdAt: Date }
     ): Promise<boolean> { ... }
     - Plugin mantém cache + resposta HTTP, delega regra de negócio ao service

     ---
     Fase 3: Mover guards e módulos de domínio

     Passo 3a: Guards → domain/identity/guards/
     - auth/role-guard.ts → domain/identity/guards/role.guard.ts
     - auth/super-admin-guard.ts → domain/identity/guards/super-admin.guard.ts
     - Re-export → atualizar 8 importadores → remover

     Passo 3b: Trial → domain/billing/trial.ts
     - billing/trial.ts → domain/billing/trial.ts
     - Importadores: store-context.plugin.ts, billing.routes.ts

     Passo 3c: Session store → domain/session/store/session-store.ts
     - session/session-store.ts → domain/session/store/session-store.ts
     - Importador: session.plugin.ts

     Passo 3d: MercadoPago → domain/billing/integrations/mercadopago.adapter.ts
     - billing/mercadopago.plugin.ts → domain/billing/integrations/mercadopago.adapter.ts
     - Importador: app.ts

     ---
     Fase 4: Mover camada HTTP

     Passo 4a: Mover schemas → http/schemas/
     - 13 arquivos de schema movem para src/http/schemas/:
       - catalog.schema.ts, category.schema.ts, coupon.schema.ts, promotion.schema.ts, featured.schema.ts, order.schema.ts,
     customer.schema.ts, analytics.schema.ts, store-profile.schema.ts, session.schema.ts, billing.schema.ts,
     password-reset.schema.ts, super.schema.ts
     - Re-export → testes passam → atualizar importadores → remover

     Passo 4b: Mover plugins → http/plugins/
     - auth/jwt.plugin.ts → http/plugins/jwt.plugin.ts
     - store/store-context.plugin.ts → http/plugins/store-context.plugin.ts
     - billing/plan-limits.plugin.ts → http/plugins/plan-limits.plugin.ts
     - session/session.plugin.ts → http/plugins/session.plugin.ts
     - Importador principal: app.ts

     Passo 4c: Mover rotas → http/routes/
     - Agrupar por bounded context:
       - auth/auth.routes.ts → http/routes/auth/auth.routes.ts
       - auth/password-reset.routes.ts → http/routes/auth/password-reset.routes.ts
       - auth/email-verification.routes.ts → http/routes/auth/email-verification.routes.ts
       - catalog/catalog.routes.ts → http/routes/catalog/catalog.routes.ts
       - categories/category.routes.ts → http/routes/catalog/category.routes.ts
       - coupons/coupon.routes.ts → http/routes/pricing/coupon.routes.ts
       - promotions/promotion.routes.ts → http/routes/pricing/promotion.routes.ts
       - featured/featured.routes.ts → http/routes/pricing/featured.routes.ts
       - orders/order.routes.ts → http/routes/order/order.routes.ts
       - customers/customer.routes.ts → http/routes/order/customer.routes.ts
       - analytics/analytics.routes.ts → http/routes/analytics/analytics.routes.ts
       - notifications/notification.routes.ts → http/routes/notification/notification.routes.ts
       - users/user.routes.ts → http/routes/admin/user.routes.ts
       - store-profile/store-profile.routes.ts → http/routes/admin/store-profile.routes.ts
       - billing/billing.routes.ts → http/routes/billing/billing.routes.ts
       - billing/webhook.routes.ts → http/routes/webhooks/mercadopago.routes.ts
       - super/*.routes.ts → http/routes/super/*.routes.ts
       - session/session.routes.ts → http/routes/session/session.routes.ts
     - Testes movem junto com suas rotas (co-located)

     ---
     Fase 5: Simplificar app.ts com barrels

     Criar barrel index.ts em cada grupo de rotas:

     // http/routes/catalog/index.ts
     export { catalogPublicRoutes, catalogAdminRoutes } from './catalog.routes'
     export { categoryPublicRoutes, categoryAdminRoutes } from './category.routes'

     // http/routes/pricing/index.ts
     export { couponPublicRoutes, couponAdminRoutes } from './coupon.routes'
     export { promotionPublicRoutes, promotionAdminRoutes } from './promotion.routes'
     export { featuredPublicRoutes, featuredAdminRoutes } from './featured.routes'

     app.ts importa dos barrels em vez de 30+ arquivos individuais. Resultado: ~80 linhas vs 169 atuais.

     ---
     Fase 6: Limpeza

     1. Remover diretórios antigos vazios (src/catalog/, src/categories/, etc.)
     2. Atualizar seção "Architecture" do CLAUDE.md com nova árvore
     3. Rodar pnpm test e pnpm lint final

     ---
     Estrutura Final

     src/
       main.ts
       vercel.ts
       app.ts                            # ~80 linhas (composição simplificada)

       shared/
         database/
           prisma.plugin.ts              # Conexão + tenant guard wrapping
           tenant-guard.ts               # Proxy multi-tenancy
         email/
           resend.plugin.ts              # Plugin Resend
           templates.ts                  # HTML templates
         cache/
           rate-limit-redis.ts           # Redis factory
         validation/
           schemas.ts                    # Zod validators (id, date, slug, etc.)
         errors/
           error-handler.ts              # ZodError + 5xx masking

       domain/
         identity/
           services/
             auth.service.ts             # registerStore, registerStaff
           guards/
             role.guard.ts               # requireOwner, requireVerifiedEmail
             super-admin.guard.ts        # requireSuperAdmin
         store/
           services/
             store-availability.service.ts
         catalog/
           services/
             product.service.ts          # toProductResponse, listarProdutos
             category.service.ts         # collectDescendantIds (BFS)
         pricing/
           services/
             coupon.service.ts           # isCouponUsable
         order/
           services/
             order.service.ts            # validateOrderArithmetic
         billing/
           trial.ts
           integrations/
             mercadopago.adapter.ts
         analytics/
           services/
             analytics.service.ts        # computeAnalyticsSummary (~280 linhas)
         notification/
           services/
             notification.service.ts     # checkExpiredEntities
         session/
           store/
             session-store.ts            # Interface + Redis/Memory implementations

       http/
         plugins/
           jwt.plugin.ts
           store-context.plugin.ts
           plan-limits.plugin.ts
           session.plugin.ts
         routes/
           auth/
             index.ts
             auth.routes.ts + test
             password-reset.routes.ts + test
             email-verification.routes.ts + test
           catalog/
             index.ts
             catalog.routes.ts + test
             category.routes.ts
           pricing/
             index.ts
             coupon.routes.ts + test
             promotion.routes.ts + test
             featured.routes.ts
           order/
             index.ts
             order.routes.ts + test
             customer.routes.ts + test
           billing/
             index.ts
             billing.routes.ts
           analytics/
             analytics.routes.ts + test
           notification/
             notification.routes.ts
           admin/
             user.routes.ts
             store-profile.routes.ts
           super/
             index.ts
             stores.routes.ts + test
             plans.routes.ts
             users.routes.ts
             metrics.routes.ts
           webhooks/
             mercadopago.routes.ts + test
           session/
             session.routes.ts
         schemas/
           (13 schema files)

       test/
         test-helpers.ts
         tenant-isolation.test.ts

     Verificação

     Após cada fase:
     1. pnpm --filter @esqueleton/api test — todos os 45+ testes devem passar
     2. pnpm lint — sem erros de tipo
     3. pnpm --filter @esqueleton/api dev — servidor inicia sem erros
     4. Testar manualmente: GET http://localhost:3001/api/health → { status: "ok" }

     Após Fase 2 (services), testes adicionais:
     - Verificar que GET /api/analytics/summary retorna os mesmos dados (lógica extraída)
     - Verificar que POST /api/lojas/:slug/orders ainda valida aritmética
     - Verificar que GET /api/lojas/:slug/coupons/codigo/:code ainda valida cupom

     Riscos

     ┌──────────────┬─────────────────────────────┬───────────────────────────────────────────┐
     │     Fase     │            Risco            │                 Mitigação                 │
     ├──────────────┼─────────────────────────────┼───────────────────────────────────────────┤
     │ 1 (shared)   │ Baixo — re-exports protegem │ git revert se quebrar                     │
     ├──────────────┼─────────────────────────────┼───────────────────────────────────────────┤
     │ 2 (services) │ Médio — extração de lógica  │ Testes cobrem via app.inject              │
     ├──────────────┼─────────────────────────────┼───────────────────────────────────────────┤
     │ 3 (guards)   │ Baixo — poucos importadores │ Re-exports temporários                    │
     ├──────────────┼─────────────────────────────┼───────────────────────────────────────────┤
     │ 4 (HTTP)     │ Alto — 25+ arquivos movem   │ Fazer em lotes com testes entre cada lote │
     ├──────────────┼─────────────────────────────┼───────────────────────────────────────────┤
     │ 5 (barrels)  │ Baixo — só app.ts muda      │ git revert                                │
     └──────────────┴─────────────────────────────┴───────────────────────────────────────────┘
     Plano: Reestruturação SOLID + DDD da API

     Contexto

     A API (apps/api/src/) tem ~4.500 linhas em 53 arquivos organizados de forma flat por feature. O código funciona bem, mas
      viola princípios SOLID: lógica de negócio misturada com HTTP handlers, app.ts com 30+ imports que precisa ser editado
     para cada nova feature, e módulos com múltiplas responsabilidades (ex: analytics.routes.ts com 270 linhas de agregação
     pura dentro do handler).

     A meta é reorganizar em camadas DDD (shared → domain → http) preservando todos os 45+ testes e o sistema de
     plugins/decorations do Fastify.

     Decisões de Design

     1. SEM repository interfaces — Prisma é o repositório; o tenant guard já é a fronteira de acesso. Services recebem
     PrismaClient como parâmetro (DI sem cerimônia).
     2. SEM entity/value-object classes — tipos Prisma são as entities; Zod schemas são a validação.
     3. SEM path aliases — tsconfig não tem e não vamos adicionar. Imports relativos ficam 1 nível mais profundos (3 níveis
     max).
     4. SEM auto-registration — barrels manuais por bounded context reduzem imports de 30+ para ~10 no app.ts.
     5. SEM service para rotas finas — customers (8 linhas), users (8 linhas), store-profile (15 linhas), promotions (20
     linhas) ficam como estão.
     6. Manter dual-export pattern — xxxPublicRoutes + xxxAdminRoutes no mesmo arquivo, pois compartilham helpers.

     Fases de Implementação

     ---
     Fase 0: Preparação (risco zero)

     1. Rodar pnpm test e pnpm lint para confirmar baseline verde
     2. Criar estrutura de pastas vazias:
     src/shared/database/
     src/shared/email/templates/
     src/shared/cache/
     src/shared/validation/
     src/shared/errors/
     src/domain/catalog/services/
     src/domain/pricing/services/
     src/domain/order/services/
     src/domain/identity/services/
     src/domain/identity/guards/
     src/domain/store/services/
     src/domain/billing/services/
     src/domain/billing/integrations/
     src/domain/analytics/services/
     src/domain/notification/services/
     src/domain/session/store/
     src/http/plugins/
     src/http/routes/auth/
     src/http/routes/catalog/
     src/http/routes/pricing/
     src/http/routes/order/
     src/http/routes/billing/
     src/http/routes/analytics/
     src/http/routes/notification/
     src/http/routes/admin/
     src/http/routes/super/
     src/http/routes/webhooks/
     src/http/routes/session/
     src/http/schemas/

     ---
     Fase 1: Mover infraestrutura compartilhada para shared/

     Estratégia: mover arquivo → criar re-export no local antigo → rodar testes → atualizar importadores → remover re-export.

     Passo 1a: common/validation.ts → shared/validation/schemas.ts
     - Mover arquivo
     - Re-export: src/common/validation.ts → export * from '../shared/validation/schemas'
     - 15+ arquivos importam daqui — re-export evita quebra
     - Atualizar importadores depois, remover re-export

     Passo 1b: common/rate-limit-redis.ts → shared/cache/rate-limit-redis.ts
     - Só app.ts importa — mover e atualizar import direto

     Passo 1c: database/ → shared/database/
     - Mover prisma.plugin.ts e tenant-guard.ts
     - Re-export temporário em src/database/
     - Importadores: app.ts, tenant-guard.test.ts

     Passo 1d: email/ → shared/email/
     - Mover resend.plugin.ts e templates.ts
     - Re-export temporário em src/email/
     - Importadores: app.ts, auth.routes.ts, password-reset.routes.ts, email-verification.routes.ts

     Passo 1e: Extrair error handler de app.ts → shared/errors/error-handler.ts
     - Extrair linhas 155-165 de app.ts (callback do setErrorHandler) para:
     // shared/errors/error-handler.ts
     export function registerErrorHandler(app: FastifyInstance): void { ... }
     - app.ts importa e chama registerErrorHandler(app)

     Passo 1f: Atualizar todos os imports para caminhos diretos e remover re-exports

     Arquivos modificados nesta fase:
     - src/app.ts
     - src/shared/database/prisma.plugin.ts (import interno de tenant-guard: ./tenant-guard)
     - src/shared/errors/error-handler.ts (novo)
     - Todos os arquivos que importam de ../common/validation, ../database/..., ../email/...

     ---
     Fase 2: Extrair services do domínio (lógica de negócio)

     Extrair lógica pura dos route handlers para funções independentes. Cada service recebe PrismaClient + storeId e retorna
     dados — sem HTTP.

     Passo 2a (P0): domain/analytics/services/analytics.service.ts — MAIOR GANHO
     - Extrair linhas 32-329 de analytics.routes.ts (270 linhas de agregação pura):
     export async function computeAnalyticsSummary(
       prisma: PrismaClient, storeId: string
     ): Promise<AnalyticsSummary> { ... }
     - Mover os tipos ProductEntry, PromotionEntry, FeaturedEntry, CouponEntry para o service
     - Route handler fica: return computeAnalyticsSummary(app.prisma, request.user.storeId)
     - analytics.routes.ts cai de 332 → ~30 linhas

     Passo 2b (P1): domain/catalog/services/product.service.ts
     - Extrair de catalog.routes.ts:
       - PRODUCT_INCLUDE (constante, linhas 11-22)
       - toProductResponse() (transformação pura, linhas 25-43)
       - listarProdutos() (filtros + paginação, linhas 59-133)
     export const PRODUCT_INCLUDE = { ... }
     export function toProductResponse(product: RawProduct): ProductResponse { ... }
     export async function listarProdutos(
       prisma: PrismaClient, storeId: string, query: ListQuery
     ): Promise<PaginatedResult> { ... }
     - catalog.routes.ts cai de 312 → ~180 linhas (CRUD admin continua na rota)

     Passo 2c (P1): domain/catalog/services/category.service.ts
     - Extrair collectDescendantIds() (BFS, linhas 99-117 de category.routes.ts):
     export async function collectDescendantIds(
       prisma: PrismaClient, rootId: string, storeId: string
     ): Promise<string[]> { ... }

     Passo 2d (P1): domain/notification/services/notification.service.ts
     - Extrair lógica de expiração (linhas 55-120 de notification.routes.ts):
     export async function checkExpiredEntities(
       prisma: PrismaClient, storeId: string
     ): Promise<number> { ... }
     - Inclui filtros de promoções, cupons e destaques expirados + createMany

     Passo 2e (P2): domain/order/services/order.service.ts
     - Extrair validação aritmética (linhas 22-31 de order.routes.ts):
     export function validateOrderArithmetic(data: {
       items: Array<{ lineTotal: number; unitPrice: number; quantity: number }>;
       subtotal: number; discount: number; total: number;
     }): boolean { ... }
     - Função pura, sem Prisma, sem async — fácil de testar unitariamente

     Passo 2f (P2): domain/pricing/services/coupon.service.ts
     - Extrair validação de cupom (linhas 35-44 de coupon.routes.ts):
     export function isCouponUsable(coupon: {
       active: boolean; startDate?: string | null; endDate?: string | null;
       maxUses: number | null; usedCount: number;
     }): { valid: boolean; reason?: string } { ... }

     Passo 2g (P2): domain/identity/services/auth.service.ts
     - Extrair transação de criação de loja (linhas 92-150 de auth.routes.ts):
     export async function registerStore(
       prisma: PrismaClient,
       params: { email: string; hashedPassword: string; storeName: string; storeSlug: string }
     ): Promise<{ store: Store; user: User }> { ... }
     - Extrair criação de staff (linhas 70-88):
     export async function registerStaff(
       prisma: PrismaClient,
       params: { email: string; hashedPassword: string; storeId: string }
     ): Promise<User> { ... }
     - Login permanece no handler (acoplado a JWT signing + rate limiting)

     Passo 2h (P2): domain/store/services/store-availability.service.ts
     - Extrair regra de disponibilidade de store-context.plugin.ts (linhas 63-77):
     export async function isStoreAvailable(
       prisma: PrismaClient,
       store: { id: string; createdAt: Date }
     ): Promise<boolean> { ... }
     - Plugin mantém cache + resposta HTTP, delega regra de negócio ao service

     ---
     Fase 3: Mover guards e módulos de domínio

     Passo 3a: Guards → domain/identity/guards/
     - auth/role-guard.ts → domain/identity/guards/role.guard.ts
     - auth/super-admin-guard.ts → domain/identity/guards/super-admin.guard.ts
     - Re-export → atualizar 8 importadores → remover

     Passo 3b: Trial → domain/billing/trial.ts
     - billing/trial.ts → domain/billing/trial.ts
     - Importadores: store-context.plugin.ts, billing.routes.ts

     Passo 3c: Session store → domain/session/store/session-store.ts
     - session/session-store.ts → domain/session/store/session-store.ts
     - Importador: session.plugin.ts

     Passo 3d: MercadoPago → domain/billing/integrations/mercadopago.adapter.ts
     - billing/mercadopago.plugin.ts → domain/billing/integrations/mercadopago.adapter.ts
     - Importador: app.ts

     ---
     Fase 4: Mover camada HTTP

     Passo 4a: Mover schemas → http/schemas/
     - 13 arquivos de schema movem para src/http/schemas/:
       - catalog.schema.ts, category.schema.ts, coupon.schema.ts, promotion.schema.ts, featured.schema.ts, order.schema.ts,
     customer.schema.ts, analytics.schema.ts, store-profile.schema.ts, session.schema.ts, billing.schema.ts,
     password-reset.schema.ts, super.schema.ts
     - Re-export → testes passam → atualizar importadores → remover

     Passo 4b: Mover plugins → http/plugins/
     - auth/jwt.plugin.ts → http/plugins/jwt.plugin.ts
     - store/store-context.plugin.ts → http/plugins/store-context.plugin.ts
     - billing/plan-limits.plugin.ts → http/plugins/plan-limits.plugin.ts
     - session/session.plugin.ts → http/plugins/session.plugin.ts
     - Importador principal: app.ts

     Passo 4c: Mover rotas → http/routes/
     - Agrupar por bounded context:
       - auth/auth.routes.ts → http/routes/auth/auth.routes.ts
       - auth/password-reset.routes.ts → http/routes/auth/password-reset.routes.ts
       - auth/email-verification.routes.ts → http/routes/auth/email-verification.routes.ts
       - catalog/catalog.routes.ts → http/routes/catalog/catalog.routes.ts
       - categories/category.routes.ts → http/routes/catalog/category.routes.ts
       - coupons/coupon.routes.ts → http/routes/pricing/coupon.routes.ts
       - promotions/promotion.routes.ts → http/routes/pricing/promotion.routes.ts
       - featured/featured.routes.ts → http/routes/pricing/featured.routes.ts
       - orders/order.routes.ts → http/routes/order/order.routes.ts
       - customers/customer.routes.ts → http/routes/order/customer.routes.ts
       - analytics/analytics.routes.ts → http/routes/analytics/analytics.routes.ts
       - notifications/notification.routes.ts → http/routes/notification/notification.routes.ts
       - users/user.routes.ts → http/routes/admin/user.routes.ts
       - store-profile/store-profile.routes.ts → http/routes/admin/store-profile.routes.ts
       - billing/billing.routes.ts → http/routes/billing/billing.routes.ts
       - billing/webhook.routes.ts → http/routes/webhooks/mercadopago.routes.ts
       - super/*.routes.ts → http/routes/super/*.routes.ts
       - session/session.routes.ts → http/routes/session/session.routes.ts
     - Testes movem junto com suas rotas (co-located)

     ---
     Fase 5: Simplificar app.ts com barrels

     Criar barrel index.ts em cada grupo de rotas:

     // http/routes/catalog/index.ts
     export { catalogPublicRoutes, catalogAdminRoutes } from './catalog.routes'
     export { categoryPublicRoutes, categoryAdminRoutes } from './category.routes'

     // http/routes/pricing/index.ts
     export { couponPublicRoutes, couponAdminRoutes } from './coupon.routes'
     export { promotionPublicRoutes, promotionAdminRoutes } from './promotion.routes'
     export { featuredPublicRoutes, featuredAdminRoutes } from './featured.routes'

     app.ts importa dos barrels em vez de 30+ arquivos individuais. Resultado: ~80 linhas vs 169 atuais.

     ---
     Fase 6: Limpeza

     1. Remover diretórios antigos vazios (src/catalog/, src/categories/, etc.)
     2. Atualizar seção "Architecture" do CLAUDE.md com nova árvore
     3. Rodar pnpm test e pnpm lint final

     ---
     Estrutura Final

     src/
       main.ts
       vercel.ts
       app.ts                            # ~80 linhas (composição simplificada)

       shared/
         database/
           prisma.plugin.ts              # Conexão + tenant guard wrapping
           tenant-guard.ts               # Proxy multi-tenancy
         email/
           resend.plugin.ts              # Plugin Resend
           templates.ts                  # HTML templates
         cache/
           rate-limit-redis.ts           # Redis factory
         validation/
           schemas.ts                    # Zod validators (id, date, slug, etc.)
         errors/
           error-handler.ts              # ZodError + 5xx masking

       domain/
         identity/
           services/
             auth.service.ts             # registerStore, registerStaff
           guards/
             role.guard.ts               # requireOwner, requireVerifiedEmail
             super-admin.guard.ts        # requireSuperAdmin
         store/
           services/
             store-availability.service.ts
         catalog/
           services/
             product.service.ts          # toProductResponse, listarProdutos
             category.service.ts         # collectDescendantIds (BFS)
         pricing/
           services/
             coupon.service.ts           # isCouponUsable
         order/
           services/
             order.service.ts            # validateOrderArithmetic
         billing/
           trial.ts
           integrations/
             mercadopago.adapter.ts
         analytics/
           services/
             analytics.service.ts        # computeAnalyticsSummary (~280 linhas)
         notification/
           services/
             notification.service.ts     # checkExpiredEntities
         session/
           store/
             session-store.ts            # Interface + Redis/Memory implementations

       http/
         plugins/
           jwt.plugin.ts
           store-context.plugin.ts
           plan-limits.plugin.ts
           session.plugin.ts
         routes/
           auth/
             index.ts
             auth.routes.ts + test
             password-reset.routes.ts + test
             email-verification.routes.ts + test
           catalog/
             index.ts
             catalog.routes.ts + test
             category.routes.ts
           pricing/
             index.ts
             coupon.routes.ts + test
             promotion.routes.ts + test
             featured.routes.ts
           order/
             index.ts
             order.routes.ts + test
             customer.routes.ts + test
           billing/
             index.ts
             billing.routes.ts
           analytics/
             analytics.routes.ts + test
           notification/
             notification.routes.ts
           admin/
             user.routes.ts
             store-profile.routes.ts
           super/
             index.ts
             stores.routes.ts + test
             plans.routes.ts
             users.routes.ts
             metrics.routes.ts
           webhooks/
             mercadopago.routes.ts + test
           session/
             session.routes.ts
         schemas/
           (13 schema files)

       test/
         test-helpers.ts
         tenant-isolation.test.ts

     Verificação

     Após cada fase:
     1. pnpm --filter @esqueleton/api test — todos os 45+ testes devem passar
     2. pnpm lint — sem erros de tipo
     3. pnpm --filter @esqueleton/api dev — servidor inicia sem erros
     4. Testar manualmente: GET http://localhost:3001/api/health → { status: "ok" }

     Após Fase 2 (services), testes adicionais:
     - Verificar que GET /api/analytics/summary retorna os mesmos dados (lógica extraída)
     - Verificar que POST /api/lojas/:slug/orders ainda valida aritmética
     - Verificar que GET /api/lojas/:slug/coupons/codigo/:code ainda valida cupom

     Riscos

     ┌──────────────┬─────────────────────────────┬───────────────────────────────────────────┐
     │     Fase     │            Risco            │                 Mitigação                 │
     ├──────────────┼─────────────────────────────┼───────────────────────────────────────────┤
     │ 1 (shared)   │ Baixo — re-exports protegem │ git revert se quebrar                     │
     ├──────────────┼─────────────────────────────┼───────────────────────────────────────────┤
     │ 2 (services) │ Médio — extração de lógica  │ Testes cobrem via app.inject              │
     ├──────────────┼─────────────────────────────┼───────────────────────────────────────────┤
     │ 3 (guards)   │ Baixo — poucos importadores │ Re-exports temporários                    │
     ├──────────────┼─────────────────────────────┼───────────────────────────────────────────┤
     │ 4 (HTTP)     │ Alto — 25+ arquivos movem   │ Fazer em lotes com testes entre cada lote │
     ├──────────────┼─────────────────────────────┼───────────────────────────────────────────┤
     │ 5 (barrels)  │ Baixo — só app.ts muda      │ git revert                                │
     └──────────────┴─────────────────────────────┴───────────────────────────────────────────┘