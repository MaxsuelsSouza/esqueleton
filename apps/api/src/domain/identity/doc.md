# domain/identity/ — Identidade e permissões

Criação de lojas e usuários, e guards de permissão.

## Arquivos

### `services/auth.service.ts`

Operações de criação de conta. Recebe `PrismaClient` e dados já validados (senha já com hash).

| Função | O que faz | Retorna |
|--------|-----------|---------|
| `registerStore(prisma, params)` | Cria loja + perfil + primeiro usuário (OWNER) em uma transação | `{ store, user }` |
| `registerStaff(prisma, params)` | Cria membro da equipe (STAFF) em loja existente | `{ id, email, role, storeId, createdAt }` |

**`registerStore` é transacional:** se qualquer parte falhar (ex: slug duplicado), nada é criado. Cria 3 registros: `Store`, `StoreProfile`, `User`.

```typescript
// Usado na rota POST /api/auth/register (sem JWT = signup público)
const { store, user } = await registerStore(app.prisma, {
  email, hashedPassword, storeName, storeSlug,
})
```

### `guards/role.guard.ts`

preHandlers Fastify para controle de acesso.

| Guard | Quando usar | Status se falhar |
|-------|-------------|-----------------|
| `requireOwner` | Rotas exclusivas do dono da loja (editar perfil, convidar equipe, plano) | 403 |
| `requireVerifiedEmail` | Chamado automaticamente pelo `app.authenticate` (jwt.plugin) | 403 após 7 dias |

**`requireVerifiedEmail`** consulta a data de criação do usuário no banco. Nos primeiros 7 dias, e-mail não verificado é aceito. Depois, bloqueia com 403 e pede verificação.

```typescript
// Uso em rotas
app.put('/', { preHandler: [requireOwner] }, handler)
```

### `guards/super-admin.guard.ts`

| Guard | Quando usar | Status se falhar |
|-------|-------------|-----------------|
| `requireSuperAdmin` | Todas as rotas `/api/super/*` | 403 |

Verifica `request.user.isSuperAdmin` (flag do JWT). Tokens antigos sem a flag recebem 403.

## Fluxo de registro (signup SaaS)

```
POST /api/auth/register (sem JWT)
  → valida body (email, password, storeName, storeSlug)
  → bcrypt.hash(password)
  → registerStore(prisma, { email, hashedPassword, storeName, storeSlug })
    → $transaction:
       1. store.create({ slug, name })
       2. storeProfile.create({ storeId, storeName })
       3. user.create({ email, password, storeId, role: 'OWNER' })
  → gera JWT com { sub, email, storeId, role }
  → envia e-mail de verificação (fire-and-forget)
  → retorna { token, role, store: { slug, name } }
```
