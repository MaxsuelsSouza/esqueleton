# Plano: Cobrança, Roles, E-mail e Super-Admin

## Contexto

O multi-tenancy (etapa 1) está completo. Agora o sistema precisa de:
- Papéis de usuário (quem é dono vs equipe)
- Verificação de e-mail e reset de senha
- Planos com limites e cobrança via MercadoPago
- Painel super-admin para gestão da plataforma

**Decisões do usuário:**
- Pagamento: MercadoPago (Preapproval API, suporta recorrência com cartão/Pix/boleto)
- E-mail: Resend (`resend` no npm)
- Super-admin: dentro do /admin existente (abas extras)
- Planos: estrutura flexível (super-admin cria planos pelo painel)

---

## Fase 1 — E-mail (Resend) + Reset de Senha

**Por que primeiro:** valida a integração de e-mail antes de usá-la para verificação. Reset de senha é independente de roles.

### Dependências
```bash
pnpm --filter @esqueleton/api add resend
```

### Variáveis de ambiente
```
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=noreply@seudominio.com.br
FRONTEND_URL=http://localhost:3000
```

### Banco (Prisma)

```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  token     String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  @@index([token])
  @@index([userId])
}
```

NÃO vai no `MODELOS_DE_LOJA` do tenant-guard (lookup por token, global).

### API — novos arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `email/resend.plugin.ts` | Plugin Fastify, decora `app.email.send(to, subject, html)`. Se `RESEND_API_KEY` não existe, loga warning e vira no-op (não quebra em dev). |
| `email/templates.ts` | Funções puras que retornam HTML: `passwordResetEmail(url, storeName)`, `emailVerificationEmail(url, storeName)` (já cria, usa na fase 2). |
| `auth/password-reset.routes.ts` | Duas rotas (sem auth). |
| `auth/password-reset.schema.ts` | Zod schemas. |

### Rotas

| Método | Caminho | Auth | Rate Limit | Descrição |
|--------|---------|------|------------|-----------|
| POST | `/api/auth/forgot-password` | Não | 3/min | Recebe `{ email }`. Cria token (`crypto.randomBytes(32).toString('hex')`), envia e-mail. **Sempre retorna 200** (não revela se e-mail existe). Token expira em 1h. |
| POST | `/api/auth/reset-password` | Não | 5/min | Recebe `{ token, password }`. Valida token (não expirado, não usado), atualiza senha (bcrypt), marca token como usado. |

### Web — novos arquivos

| Arquivo | Descrição |
|---------|-----------|
| `admin/esqueci-senha/page.tsx` | Formulário com e-mail. Chama forgot-password. Mostra sucesso sempre. |
| `admin/redefinir-senha/page.tsx` | Lê `?token=xxx` da URL. Formulário nova senha + confirmação. Redireciona ao login após sucesso. |

### Alterações em arquivos existentes

- `auth.service.ts` — adiciona `forgotPassword(email)` e `resetPassword(token, password)`
- `admin/login/page.tsx` — link "Esqueci minha senha" abaixo do campo de senha
- `app.ts` — registra `resendPlugin` e `passwordResetRoutes`

---

## Fase 2 — Roles (OWNER/STAFF) + Verificação de E-mail

### Banco (Prisma)

Alterações no `User`:
```prisma
model User {
  // ... campos existentes ...
  role          String   @default("STAFF")    // OWNER | STAFF
  emailVerified Boolean  @default(false)
  // ... relações existentes + novas ...
  emailVerificationTokens EmailVerificationToken[]
}
```

Novo modelo:
```prisma
model EmailVerificationToken {
  id        String    @id @default(cuid())
  token     String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  @@index([token])
  @@index([userId])
}
```

### Migração de dados existentes

```sql
-- Primeiro usuário de cada loja (por createdAt) vira OWNER + emailVerified
UPDATE "User" SET role = 'OWNER', "emailVerified" = true
WHERE id IN (
  SELECT DISTINCT ON ("storeId") id
  FROM "User" ORDER BY "storeId", "createdAt" ASC
);
```

### JWT — payload expandido

```typescript
{ sub, email, storeId, role, emailVerified }
```

Tokens antigos (sem role) são rejeitados — exige re-login.

### Tipos compartilhados (`packages/shared`)

- `UserRole = 'OWNER' | 'STAFF'`
- `User` ganha `role` e `emailVerified`
- `LoginResponse` ganha `role` e `emailVerified`

### API — novos arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `auth/role-guard.ts` | `requireOwner(req, reply)` — retorna 403 se não é OWNER. `requireVerifiedEmail(req, reply)` — bloqueia após 7 dias sem verificação. |
| `auth/email-verification.routes.ts` | Rotas de verificação. |
| `users/user.routes.ts` | CRUD de usuários da loja (OWNER only). |

### Rotas de verificação

| Método | Caminho | Auth | Rate Limit | Descrição |
|--------|---------|------|------------|-----------|
| POST | `/api/auth/verify-email` | Não | 10/min | Recebe `{ token }`. Marca `emailVerified = true`. |
| POST | `/api/auth/resend-verification` | JWT | 2/min | Cria novo token, reenvia e-mail. |

### Rotas de gestão de usuários (OWNER only)

| Método | Caminho | Auth | Role | Descrição |
|--------|---------|------|------|-----------|
| GET | `/api/users` | JWT | OWNER | Lista usuários da loja. |
| DELETE | `/api/users/:id` | JWT | OWNER | Remove staff. Não pode remover a si mesmo. |

### Rotas existentes que ganham `requireOwner`

- `PUT /api/store-profile` (editar perfil da loja)
- `POST /api/auth/register` modo 2 (convidar staff)

### Mudanças no fluxo de register

- **Modo 1 (público):** cria user com `role: 'OWNER'`, `emailVerified: false`. Gera token de verificação e envia e-mail.
- **Modo 2 (convite):** cria user com `role: 'STAFF'`. Envia e-mail de boas-vindas.

### Verificação — regra de bloqueio

Após 7 dias sem verificar, `requireVerifiedEmail` bloqueia todas as rotas admin exceto `resend-verification`. Checa `emailVerified` do JWT + consulta `createdAt` no banco quando `emailVerified = false`.

### Web

| Arquivo | Descrição |
|---------|-----------|
| `admin/usuarios/page.tsx` | Tabela de usuários. Botão "Convidar" (form email+senha). Botão "Remover". Só visível para OWNER. |
| `services/users.service.ts` | `listUsers()`, `deleteUser(id)` |

**Alterações existentes:**
- `useAdminAuth.ts` — armazena `role` e `emailVerified`
- `login/page.tsx` — salva `admin_role` e `admin_email_verified` no localStorage
- `admin/layout.tsx` — banner amarelo se e-mail não verificado; item "Equipe" no nav só para OWNER; esconde "Perfil" de STAFF (ou mostra read-only)

---

## Fase 3 — Planos e Cobrança (MercadoPago)

### Dependências
```bash
pnpm --filter @esqueleton/api add mercadopago
```

### Variáveis de ambiente
```
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxx
MERCADOPAGO_WEBHOOK_SECRET=xxxxx
```

### Banco (Prisma)

```prisma
model Plan {
  id                           String   @id @default(cuid())
  name                         String
  slug                         String   @unique
  limits                       Json     // { maxProducts, maxUsers, maxOrdersPerMonth, ... }
  priceInCents                 Int      @default(0)   // 0 = gratuito
  billingPeriod                String   @default("MONTHLY")  // MONTHLY | YEARLY
  mercadoPagoPreapprovalPlanId String?
  active                       Boolean  @default(true)
  sortOrder                    Int      @default(0)
  createdAt                    DateTime @default(now())
  updatedAt                    DateTime @updatedAt
  subscriptions                Subscription[]
}

model Subscription {
  id                         String    @id @default(cuid())
  storeId                    String
  store                      Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  planId                     String
  plan                       Plan      @relation(fields: [planId], references: [id])
  status                     String    @default("PENDING")  // ACTIVE | PAUSED | CANCELLED | PENDING
  mercadoPagoPreapprovalId   String?
  currentPeriodStart         DateTime?
  currentPeriodEnd           DateTime?
  createdAt                  DateTime  @default(now())
  updatedAt                  DateTime  @updatedAt
  @@index([storeId])
  @@index([planId])
}
```

- `Plan` **NÃO** vai no `MODELOS_DE_LOJA` (entidade da plataforma)
- `Subscription` **VAI** no `MODELOS_DE_LOJA`

### Migração de dados existentes

```sql
-- Cria plano gratuito padrão
INSERT INTO "Plan" (id, name, slug, limits, "priceInCents", active, "sortOrder", ...)
VALUES ('plan-free', 'Gratuito', 'gratuito', '{"maxProducts":50,"maxUsers":2,"maxOrdersPerMonth":100}', 0, true, 0, ...);

-- Toda loja existente ganha assinatura gratuita
INSERT INTO "Subscription" (id, "storeId", "planId", status, ...)
SELECT gen_random_uuid()::text, id, 'plan-free', 'ACTIVE', ... FROM "Store";
```

### API — novos arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `billing/plan-limits.plugin.ts` | Decora `app.checkPlanLimit(storeId, 'maxProducts')`. Busca subscription ativa → plan → limits. Compara com uso atual. Lança 403 "Limite do plano atingido" se exceder. |
| `billing/mercadopago.plugin.ts` | Inicializa SDK, decora `app.mercadopago` com `createPreapprovalPlan()`, `createSubscription()`, `cancelSubscription()`. |
| `billing/billing.routes.ts` | Rotas de billing da loja. |
| `billing/billing.schema.ts` | Zod schemas. |
| `billing/webhook.routes.ts` | Webhook do MercadoPago. |

### Rotas de billing

| Método | Caminho | Auth | Role | Descrição |
|--------|---------|------|------|-----------|
| GET | `/api/billing/plans` | Não | — | Lista planos ativos (público, para página de preços). |
| GET | `/api/billing/current` | JWT | Qualquer | Subscription + plan + uso atual. |
| POST | `/api/billing/subscribe` | JWT | OWNER | `{ planId }`. Cria subscription no MercadoPago, retorna URL de checkout (init_point). |
| POST | `/api/billing/cancel` | JWT | OWNER | Cancela subscription, volta pro plano gratuito. |

### Webhook

| Método | Caminho | Auth | Descrição |
|--------|---------|------|-----------|
| POST | `/api/webhooks/mercadopago` | Nenhuma (valida assinatura) | Eventos: `authorized_payment` → ACTIVE, `paused` → PAUSED, `cancelled` → CANCELLED. |

### Onde checar limites (preHandler nas rotas existentes)

- `POST /api/products` → `maxProducts`
- `POST /api/auth/register` modo 2 → `maxUsers`
- `POST /api/lojas/:slug/orders` → `maxOrdersPerMonth`

### Web

| Arquivo | Descrição |
|---------|-----------|
| `admin/plano/page.tsx` | Plano atual, limites, uso. Botão "Trocar plano" (OWNER). Botão "Cancelar" (OWNER). |
| `services/billing.service.ts` | Chamadas de billing. |

- `admin/layout.tsx` — adiciona "Plano" no nav

---

## Fase 4 — Super-Admin

### Banco (Prisma)

```prisma
model User {
  // ... campos existentes ...
  isSuperAdmin Boolean @default(false)
}
```

Definido manualmente no banco. Sem UI para criar super-admins.

### JWT

```typescript
{ sub, email, storeId, role, emailVerified, isSuperAdmin }
```

### API — novos arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `auth/super-admin-guard.ts` | `requireSuperAdmin(req, reply)` — 403 se `!isSuperAdmin`. |
| `super/super-stores.routes.ts` | Gestão de lojas da plataforma. |
| `super/super-plans.routes.ts` | CRUD de planos. |
| `super/super-metrics.routes.ts` | Métricas da plataforma. |
| `super/super-users.routes.ts` | Lista de todos os usuários. |
| `super/super.schema.ts` | Schemas Zod. |

### Tenant guard — bypass para super-admin

`prisma.plugin.ts` ganha um segundo decorator `prismaRaw` (cliente Prisma sem tenant guard). Usado **somente** nas rotas super-admin para queries cross-store.

### Rotas

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/api/super/stores` | Lista lojas com paginação, busca, filtro por status. |
| GET | `/api/super/stores/:id` | Detalhe: usuários, subscription, métricas. |
| PATCH | `/api/super/stores/:id` | Altera status (ACTIVE/SUSPENDED), plano. |
| GET | `/api/super/plans` | Lista todos os planos (inclusive inativos). |
| POST | `/api/super/plans` | Cria plano. Se pago, cria preapproval no MercadoPago. |
| PUT | `/api/super/plans/:id` | Atualiza plano. |
| DELETE | `/api/super/plans/:id` | Desativa (soft-delete). Bloqueia se há lojas inscritas. |
| GET | `/api/super/users` | Lista todos os usuários da plataforma. |
| GET | `/api/super/metrics` | Total lojas, ativas/suspensas, total usuários, MRR, subscriptions por plano. |

### Web

| Arquivo | Descrição |
|---------|-----------|
| `admin/super/lojas/page.tsx` | Tabela de lojas. Busca, filtro por status. Suspender/ativar, trocar plano. |
| `admin/super/planos/page.tsx` | CRUD de planos. Form: nome, slug, limites, preço, período, ordem. |
| `admin/super/usuarios/page.tsx` | Tabela de todos os usuários. |
| `admin/super/metricas/page.tsx` | Dashboard: totais, MRR, gráfico de subscriptions por plano. |
| `services/super.service.ts` | Chamadas super-admin. |

- `admin/layout.tsx` — se `isSuperAdmin`, mostra seção "Plataforma" no nav com os 4 itens
- `useAdminAuth.ts` — salva `admin_is_super_admin` no localStorage
- `login/page.tsx` — salva `admin_is_super_admin` no login

---

## Fase 5 — Testes e Polish

### Testes a criar/atualizar

| Teste | O que cobre |
|-------|-------------|
| `auth/password-reset.test.ts` | Criação de token, expiração, uso, token inválido |
| `auth/email-verification.test.ts` | Verificação, reenvio, bloqueio após 7 dias |
| `auth/role-guard.test.ts` | OWNER passa, STAFF recebe 403 |
| `auth/super-admin-guard.test.ts` | Super-admin passa, outros recebem 403 |
| `auth/auth.routes.test.ts` (atualizar) | Register cria OWNER, modo 2 cria STAFF, token tem role |
| `billing/plan-limits.test.ts` | Dentro do limite ok, acima lança 403 |
| `billing/webhook.test.ts` | Assinatura válida/inválida, transições de status |
| `super/super-stores.test.ts` | CRUD com/sem isSuperAdmin |
| `test/tenant-isolation.test.ts` (atualizar) | Subscription isolada por storeId |

### Notificações novas

- `PLAN_LIMIT_APPROACHING` — uso a 80% de um limite
- `SUBSCRIPTION_CANCELLED` — assinatura cancelada
- `SUBSCRIPTION_PAYMENT_FAILED` — pagamento falhou

---

## Resumo de dependências e env vars

**npm:** `resend`, `mercadopago`

**Env vars novas:**
```
RESEND_API_KEY, FROM_EMAIL, FRONTEND_URL
MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_WEBHOOK_SECRET
```

## Ordem de execução

| Fase | Depende de | Escopo |
|------|-----------|--------|
| 1. E-mail + Reset de senha | — | 7 arquivos novos, 3 alterados |
| 2. Roles + Verificação | Fase 1 | 6 arquivos novos, 7 alterados |
| 3. Planos + MercadoPago | Fase 2 | 7 arquivos novos, 5 alterados |
| 4. Super-Admin | Fase 3 | 11 arquivos novos, 5 alterados |
| 5. Testes e polish | Fase 4 | 9 arquivos de teste |

## Verificação

1. `pnpm lint` — sem erros de tipo
2. `pnpm test` — todos os testes passam
3. Testar manualmente: register → e-mail de verificação → verificar → login → ver role no token
4. Testar reset de senha: esqueci senha → e-mail → link → nova senha → login
5. Testar limites: criar produtos até o limite → 403
6. Testar webhook: simular evento MercadoPago → subscription atualizada
7. Testar super-admin: flag no banco → login → abas extras visíveis → CRUD de lojas e planos
