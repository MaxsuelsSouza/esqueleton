# http/plugins/ — Plugins Fastify

Extensões que adicionam decorators e hooks ao servidor. Registrados em `app.ts` na ordem correta.

## Arquivos

### `jwt.plugin.ts`

Autenticação JWT para rotas admin.

**Registra:**
- `app.authenticate` — preHandler que verifica o token e popula `request.user`
- `request.user` — `{ sub, email, storeId, role, emailVerified, isSuperAdmin? }`

**Comportamento:**
- `JWT_SECRET` obrigatório em produção (lança erro ao iniciar sem ele)
- Token expira em 1 dia
- Tokens sem `storeId` ou `role` → 401
- Após 7 dias sem verificar e-mail → 403 (exceto rotas com `config: { skipEmailVerification: true }`)

```typescript
// Em uma rota admin
app.addHook('preHandler', app.authenticate)

// Rota que não exige e-mail verificado
app.post('/', { config: { skipEmailVerification: true } }, handler)
```

---

### `store-context.plugin.ts`

Resolução de loja nas rotas públicas (`/api/lojas/:slug/...`).

**Registra:**
- `app.resolveStore` — preHandler que lê `:slug` da URL e anexa `request.store`
- `request.store` — `{ id, slug, name }` (undefined se não resolvido)

**Comportamento:**
- Slug inválido (regex) → 404 sem consultar banco
- Slug inexistente ou loja `SUSPENDED` → 404
- Loja fora do trial e sem assinatura → 503 (mensagem genérica)
- Cache in-memory: TTL 60s, máximo 1000 entradas (LRU)
- Slugs inexistentes também são cacheados (evita flood ao banco)

```typescript
// Em app.ts — grupo de rotas públicas
publicApp.addHook('preHandler', publicApp.resolveStore)
// Nas rotas: request.store!.id
```

---

### `plan-limits.plugin.ts`

Verificação de limites do plano antes de criar recursos.

**Registra:**
- `app.checkPlanLimit(key)` — retorna preHandler que bloqueia com 403 se limite atingido
- `app.planLimitStatus(storeId, key)` — consulta situação de um limite

**Limites suportados:** `maxProducts`, `maxUsers`, `maxOrdersPerMonth`

**Comportamento:**
- Sem assinatura ativa → sem limites (nunca bloqueia)
- Limite não definido no plano → ilimitado
- A 80% de uso → cria notificação `PLAN_LIMIT_APPROACHING` (fire-and-forget)
- storeId vem de `request.user?.storeId` (admin) ou `request.store?.id` (público)

```typescript
// Em uma rota
app.post('/', { preHandler: [app.checkPlanLimit('maxProducts')] }, handler)
```

---

### `session.plugin.ts`

Armazém de sacola e favoritos dos visitantes.

**Registra:**
- `app.sessionStore` — implementação de `SessionStore` (Redis ou memória)

**Comportamento:**
- Com `REDIS_URL`: usa Redis com TTL de 30 dias
- Sem `REDIS_URL`: usa Map em memória (dados perdem-se ao reiniciar)
- Fecha conexão Redis no hook `onClose`

```typescript
// Nas rotas de sessão
const cart = await app.sessionStore.getCart(storeId, sessionToken)
```

## Ordem de registro (importante)

```
1. prismaPlugin      ← precisa existir antes de tudo
2. jwtAuthPlugin     ← usa prisma para verificar email
3. resendPlugin      ← independente
4. storeContextPlugin ← usa prisma + isStoreAvailable
5. mercadopagoPlugin ← independente
6. planLimitsPlugin  ← usa prisma + subscription
7. sessionPlugin     ← independente (usa Redis próprio)
```

Nunca altere esta ordem sem entender as dependências entre plugins.
