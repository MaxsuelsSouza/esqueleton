# Plano de implementação — Multi-tenancy (Etapa 1 do SaaS)

> **Objetivo:** transformar o sistema de "uma loja, um banco" em "várias lojas no mesmo banco",
> com isolamento total de dados entre lojas. Esta etapa NÃO inclui cobrança, subdomínios,
> papéis de usuário (roles) nem envio de e-mail — isso vem nas etapas seguintes.

## Conceito central

Cada loja vira um **tenant** (inquilino). Todo dado do sistema passa a ter um dono:
a coluna `storeId`. Nenhuma consulta ao banco pode rodar sem dizer de qual loja é.

Duas formas de descobrir a loja em cada requisição:

| Quem chama | Como a loja é identificada |
|------------|---------------------------|
| Painel admin (rotas protegidas) | `storeId` gravado dentro do token JWT |
| Catálogo público (visitantes) | `slug` da loja na URL: `/api/lojas/:slug/...` |

---

## Fase A — Banco de dados (Prisma)

### A1. Novo modelo `Store`

```prisma
// Loja (tenant) — cada cliente do SaaS tem uma
model Store {
  id        String   @id @default(cuid())
  // Identificador usado na URL pública (ex: "perfumaria-ana") — só letras minúsculas, números e hífen
  slug      String   @unique
  name      String
  // ACTIVE = funcionando | SUSPENDED = suspensa (preparação para a etapa de cobrança)
  status    String   @default("ACTIVE")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### A2. Adicionar `storeId` em todos os modelos

Modelos que recebem `storeId String` + relação + `@@index([storeId])`:

`User`, `Product`, `Category`, `Featured`, `Promotion`, `Coupon`,
`StoreProfile`, `Order`, `Customer`, `ProductEvent`, `Notification`.

(`ProductCategory` não precisa — herda o isolamento de `Product` e `Category`.)

### A3. Índices únicos que mudam de globais para "únicos por loja"

Hoje são únicos no sistema inteiro; passam a ser únicos **dentro de cada loja**:

| Modelo | Hoje | Vira |
|--------|------|------|
| `Coupon` | `code @unique` | `@@unique([storeId, code])` |
| `Customer` | `phone @unique` | `@@unique([storeId, phone])` |
| `Order` | `orderNumber @unique` | `@@unique([storeId, orderNumber])` |
| `Notification` | `@@unique([type, entityId])` | `@@unique([storeId, type, entityId])` |
| `StoreProfile` | `id = "singleton"` | `storeId @unique` (um perfil por loja, id vira cuid normal) |

`User.email` **continua único global** — um e-mail só pode ter uma conta no SaaS inteiro
(simplifica o login; quem precisar de duas lojas usa dois e-mails, ou esperamos a etapa de roles).

### A4. Migração com backfill (os dados atuais viram a "loja 1")

A migração não pode quebrar quem já tem dados. Estratégia em um único arquivo de
migração SQL editado à mão (`prisma migrate dev --create-only` e editar):

1. Cria a tabela `Store`.
2. Insere a loja inicial usando o `storeName` do `StoreProfile` existente
   (slug derivado do nome, ex: `minha-loja`). Se não existir perfil, cria com padrão.
3. Adiciona `storeId` como coluna **opcional** em todas as tabelas.
4. `UPDATE` em cada tabela apontando para a loja inicial.
5. Altera `storeId` para **obrigatório** (`NOT NULL`) e cria as chaves estrangeiras.
6. Derruba os índices únicos antigos e cria os compostos da tabela A3.
7. No `StoreProfile`, troca o id fixo `"singleton"` por cuid e cria `storeId UNIQUE`.

Banco novo (sem dados) roda a mesma migração sem efeito colateral — os `UPDATE`s
simplesmente não encontram linhas.

---

## Fase B — Autenticação e contexto de loja na API

### B1. Token JWT passa a carregar a loja

`auth.routes.ts` (login) e `jwt.plugin.ts` (tipos):

```ts
// antes
payload: { sub: string; email: string }
// depois
payload: { sub: string; email: string; storeId: string }
```

Tokens antigos (sem `storeId`) deixam de funcionar — o usuário só precisa fazer
login de novo. Aceitável: o token já expira em 1 dia.

### B2. Cadastro cria a loja junto com o usuário

`POST /api/auth/register` muda de significado:

- **Hoje:** só o primeiro usuário do sistema se cadastra livre; depois exige JWT.
- **Depois:** cadastro público sempre aberto — cria `Store` + `User` numa transação.
  O formulário pede e-mail, senha, **nome da loja** e **slug** (com sugestão automática).
- Criar um segundo usuário **na mesma loja** continua exigindo JWT de quem já é
  daquela loja (a trava atual vira uma trava por loja).
- Validação nova em `common/validation.ts`: `slugSchema`
  (`/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/` + lista de slugs reservados:
  `admin`, `api`, `www`, `login`, `app` etc.).

### B3. Resolver a loja nas rotas públicas

Novo plugin `store/store-context.plugin.ts` com um `preHandler` reutilizável:

```ts
// Lê o :slug da URL, busca a loja e guarda em request.store
// 404 "Loja não encontrada" se o slug não existir
// (cache em memória de 60s por slug para não consultar o banco a cada requisição)
app.decorate('resolveStore', ...)
```

As rotas públicas mudam de endereço — ganham o prefixo da loja:

| Hoje (pública) | Depois |
|----------------|--------|
| `GET /api/products` | `GET /api/lojas/:slug/products` |
| `GET /api/products/:id` | `GET /api/lojas/:slug/products/:id` |
| `GET /api/store-profile` | `GET /api/lojas/:slug/store-profile` |
| `GET /api/promotions` (ativas) | `GET /api/lojas/:slug/promotions` |
| `GET /api/featured` (ativas) | `GET /api/lojas/:slug/featured` |
| `GET /api/categories` | `GET /api/lojas/:slug/categories` |
| `GET /api/coupons/codigo/:code` | `GET /api/lojas/:slug/coupons/codigo/:code` |
| `POST /api/orders` | `POST /api/lojas/:slug/orders` |
| `POST /api/customers` | `POST /api/lojas/:slug/customers` |
| `POST /api/analytics/...` | `POST /api/lojas/:slug/analytics/...` |

As rotas do **admin** ficam nos endereços atuais (`/api/products`, `/api/orders`...),
mas todas passam a filtrar pelo `storeId` do token.

Organização: cada arquivo de rotas é dividido em duas funções —
`publicCatalogRoutes` (registrada sob `/api/lojas/:slug`) e as rotas admin
(registradas nos prefixos atuais). O `app.ts` registra os dois grupos.

### B4. Rede de segurança contra vazamento entre lojas

Filtrar `storeId` em toda consulta é disciplina — e um esquecimento vaza dados de
um cliente para outro. Duas proteções:

1. **Guarda no Prisma** (`database/tenant-guard.ts`): uma extensão `$extends` que
   intercepta `findMany`, `findFirst`, `update*`, `delete*`, `count`, `aggregate`
   nos modelos de tenant e **lança erro em desenvolvimento/teste** se o `where`
   não contém `storeId`. Não tenta injetar o filtro magicamente — só acusa o
   esquecimento, o que mantém o código das rotas explícito e legível.
2. **Testes de isolamento** (Fase E) que provam que a loja A não enxerga dados da loja B.

### B5. Padrão para update/delete com checagem de dono

`update`/`delete` do Prisma exigem `where` único — não dá para passar `{ id, storeId }`
direto. Padrão adotado em todas as rotas (já devolve 404 sem vazar existência):

```ts
// updateMany/deleteMany aceitam filtro composto e devolvem a contagem
const { count } = await app.prisma.product.deleteMany({ where: { id, storeId } })
if (count === 0) return reply.status(404).send({ message: 'Produto não encontrado' })
```

Para updates que precisam devolver o registro: `updateMany` + `findFirst`, ou
`findFirst({ where: { id, storeId } })` antes do `update` dentro de uma transação.

---

## Fase C — Mudanças rota a rota (API)

| Arquivo | O que muda |
|---------|-----------|
| `auth/auth.routes.ts` | Register cria `Store` + `User` (transação, slug validado); login assina `storeId` no token; "segundo usuário" vira regra por loja |
| `catalog/catalog.routes.ts` | GETs públicos vão para `/api/lojas/:slug`; `/options` e POST/PUT/DELETE filtram pelo `storeId` do token; create grava `storeId` |
| `categories/category.routes.ts` | Mesmo padrão; ao criar com `parentId`, conferir que o pai é da mesma loja |
| `coupons/coupon.routes.ts` | Busca por código usa o único composto: `where: { storeId_code: { storeId, code } }` |
| `promotions/promotion.routes.ts` | Lista pública (ativas) por slug; admin por token |
| `featured/featured.routes.ts` | Idem promoções |
| `store-profile/store-profile.routes.ts` | Some o `SINGLETON_ID`; upsert por `storeId` (público lê via slug, admin edita via token) |
| `orders/order.routes.ts` | POST público grava `storeId` da loja do slug; incremento de cupom usa único composto; busca/list/patch do admin filtram por `storeId`; notificações criadas com `storeId` |
| `customers/customer.routes.ts` | Upsert por `storeId_phone` |
| `analytics/analytics.routes.ts` | Eventos gravados com `storeId`; dashboard filtra por `storeId` do token |
| `notifications/notification.routes.ts` | Lista/marca como lida só da própria loja |
| `common/validation.ts` | Novo `slugSchema` |

## Fase D — Web (Next.js)

### D1. Catálogo público ganha o slug na URL

Páginas públicas movem para um segmento dinâmico:

```
src/app/page.tsx                →  src/app/loja/[slug]/page.tsx
src/app/produto/[id]/page.tsx   →  src/app/loja/[slug]/produto/[id]/page.tsx
src/app/sacola/page.tsx         →  src/app/loja/[slug]/sacola/page.tsx
src/app/favoritos/page.tsx      →  src/app/loja/[slug]/favoritos/page.tsx
```

- A raiz `/` vira uma página simples de apresentação do SaaS (placeholder).
- `Header.tsx` e os links internos passam a montar URLs com o slug.
- Favoritos e sacola no `localStorage` ganham a chave por loja (ex: `sacola:<slug>`)
  para um visitante de duas lojas não misturar as sacolas.
- Quando chegar a etapa de subdomínios, um `middleware.ts` reescreve
  `minhaloja.dominio.com` → `/loja/minhaloja` — a estrutura por segmento já fica pronta.

### D2. Serviços

- `api-client.ts`: ganha um jeito de montar caminhos públicos com slug
  (ex: `publicPath(slug, '/products')` → `/lojas/<slug>/products`).
- Cada service (`catalog`, `categories`, `promotions`, `coupons`, `featured`,
  `store-profile`, `orders`, `customers`, `analytics`) ganha a variante pública
  com slug; as chamadas do admin continuam como estão (token resolve a loja).
- O slug nas páginas públicas vem de `params.slug` (App Router).

### D3. Admin

- `/admin/login`: além de entrar, ganha o fluxo "criar minha loja"
  (nome da loja + slug com sugestão automática + e-mail + senha).
- Depois do login, o admin funciona igual a hoje — o token carrega a loja.
- Link "ver minha loja" no admin aponta para `/loja/<slug>` (o slug pode ser
  devolvido no corpo do login junto com o token e guardado no `localStorage`).

### D4. Tipos compartilhados (`packages/shared`)

- Novo tipo `Store { id, slug, name, status }`.
- `User` ganha `storeId`.
- Resposta do login vira `{ token, store: { slug, name } }`.

## Fase E — Testes

1. **Atualizar helpers** (`test/test-helpers.ts`): `createTestToken` passa a aceitar
   e assinar `storeId` (padrão `loja-teste`).
2. **Atualizar os testes existentes** — os fakes de Prisma passam a esperar
   `storeId` nos `where`/`data` (o guard da Fase B4 ajuda a achar o que faltou).
3. **Novos testes de isolamento** (`test/tenant-isolation.test.ts`):
   - Token da loja A não lê/edita/exclui produto, cupom, pedido e notificação da loja B (404).
   - `GET /api/lojas/loja-a/products` não devolve produto da loja B.
   - Cupom com mesmo código em duas lojas: cada slug valida apenas o seu.
   - Register cria loja + usuário; segundo register na mesma loja sem token → 403.
   - Slug inexistente → 404 "Loja não encontrada"; slug reservado no cadastro → 400.

## Fase F — Documentação

- Atualizar o `CLAUDE.md`: nova seção de multi-tenancy nas regras de segurança,
  arquitetura, fluxo de cadastro e a tabela de rotas públicas com slug.
- Atualizar `.env.example` se necessário (nenhuma variável nova prevista).

---

## Ordem de execução sugerida (cada passo deixa o projeto compilando)

1. **A** — Schema + migração com backfill (`db:migrate`, `db:generate`).
2. **B1/B2** — JWT com `storeId` + register criando loja (+ testes de auth atualizados).
3. **B3/B4/B5** — Plugin `resolveStore`, guard do Prisma, padrão update/delete.
4. **C** — Rotas, uma feature por commit (catalog → categories → coupons →
   promotions → featured → store-profile → orders → customers → analytics → notifications).
5. **E** — Testes de isolamento (alguns já escritos junto com cada rota).
6. **D** — Web: mover páginas públicas para `/loja/[slug]`, services, login/cadastro.
7. **F** — CLAUDE.md.

## Fora do escopo desta etapa (etapas futuras)

- Cobrança/planos e limites por plano (etapa de billing).
- Subdomínio por loja e domínio próprio (etapa de domínios — o middleware
  só reescreve para `/loja/[slug]`, que esta etapa já deixa pronto).
- Papéis de usuário (OWNER/STAFF), verificação de e-mail, reset de senha.
- Migração das imagens base64 para storage externo.
- Rate limit distribuído (Redis) e painel super-admin.

## Riscos e pontos de atenção

- **Maior risco: esquecimento de filtro `storeId`** em alguma consulta — mitigado
  pelo guard (B4) e pelos testes de isolamento (E).
- **Tokens antigos param de funcionar** após o deploy — basta refazer login.
- **URLs públicas mudam** (`/` → `/loja/<slug>`): se já houver link divulgado,
  manter um redirect da raiz para a loja inicial durante a transição.
- **`USE_MOCK_DATA`**: as páginas públicas movidas continuam respeitando a flag,
  mas o mock não conhece slug — o mock passa a ignorar o slug (qualquer slug
  mostra os mesmos dados de exemplo) até a etapa de desligar os mocks.
- A migração SQL editada à mão deve ser testada num banco com dados reais
  (dump local) antes de ir para produção.
