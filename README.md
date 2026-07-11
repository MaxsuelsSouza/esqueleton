# Esqueleton

Plataforma **SaaS multi-tenant** para criação de catálogos e vitrines online. Várias lojas compartilham o mesmo banco de dados e a mesma API — cada loja é identificada por um `slug` e tem seus dados totalmente isolados.

> Pensado para vitrines de produtos, catálogos e lojas simples com checkout via WhatsApp. **Não** é um e-commerce com pagamento integrado nem um sistema de alto tráfego.

## Como funciona (visão de 1 minuto)

1. O lojista cria a conta em `/admin/login` ("Criar minha loja") — isso cria a `Store`, o perfil e o primeiro usuário (`OWNER`) em uma única transação.
2. Ele ganha **7 dias de teste grátis** (contados da criação da loja). Depois disso, o catálogo público só funciona com uma **assinatura ativa** (Stripe) — o painel admin continua acessível para assinar.
3. O catálogo público fica disponível em `plataforma.com/loja/meu-slug` **ou** via subdomínio `meu-slug.plataforma.com`.
4. O cliente final navega no catálogo, monta a sacola e envia o pedido pelo **WhatsApp**.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Monorepo | pnpm workspaces |
| API | Fastify 4 + TypeScript (CommonJS) |
| Web | Next.js 14 + TypeScript + Tailwind CSS (App Router) |
| Banco | PostgreSQL via Prisma |
| Auth | JWT (`@fastify/jwt`) + bcryptjs |
| E-mail | Resend (reset de senha, verificação de e-mail) |
| Imagens | Cloudflare R2 (S3-compatible) — base64 inline em dev |
| Billing | Stripe (assinaturas recorrentes + webhook) |
| Rate limit | `@fastify/rate-limit` (memória ou Redis via `REDIS_URL`) |
| Tipos compartilhados | `packages/shared` (sem build step) |

## Rodando localmente

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir o Postgres local
docker-compose up -d

# 3. Copiar variáveis de ambiente
#    apps/api/.env.example  -> apps/api/.env
#    apps/web/.env.example  -> apps/web/.env.local

# 4. Rodar migrações
pnpm --filter @esqueleton/api db:migrate

# 5. Subir tudo em modo dev (API :3001, Web :3000)
pnpm dev
```

Em dev, tudo que é integração externa é opcional: sem `RESEND_API_KEY` os e-mails são apenas logados; sem credenciais R2 as imagens ficam em base64 no banco; sem `STRIPE_SECRET_KEY` o billing vira no-op.

### Comandos úteis

```bash
pnpm dev                                   # API + Web em modo dev
pnpm dev --loja1                           # rodar contra um banco alternativo (perfil)
pnpm lint                                  # type-check de todos os pacotes
pnpm test                                  # todos os testes (Vitest)
pnpm --filter @esqueleton/api db:migrate   # migrações Prisma
pnpm --filter @esqueleton/api db:studio    # Prisma Studio
```

## Estrutura do monorepo

```
apps/
  api/          # Fastify — shared/ (infra), domain/ (negócio), http/ (rotas)
  web/          # Next.js — loja pública (/loja/[slug]) + painel (/admin)
packages/
  shared/       # Tipos TypeScript compartilhados (Product, Category, ...)
docs/           # Planos, QA e documentação (docs/notion/ = wiki completa)
```

### API em três camadas

- `shared/` — infraestrutura transversal: Prisma + **tenant guard**, e-mail, storage R2, cache, validação Zod, error handler.
- `domain/` — lógica de negócio pura, sem HTTP: identity, store, catalog, pricing, order, billing, analytics, notification, session.
- `http/` — rotas Fastify, schemas Zod e plugins (JWT, store-context, plan-limits). Cada feature exporta `<feature>PublicRoutes` (sob `/api/lojas/:slug`) e `<feature>AdminRoutes` (JWT obrigatório).

## Multi-tenancy (o coração do sistema)

- **Todo** modelo de dados de loja tem `storeId` obrigatório apontando para `Store`.
- Requests **admin**: o JWT carrega `storeId` — toda query filtra por `request.user.storeId`.
- Requests **públicos**: rotas sob `/api/lojas/:slug/...`; o plugin `resolveStore` resolve o slug (cache de 60s) e anexa `request.store`.
- **Tenant guard** (`shared/database/tenant-guard.ts`): envolve o Prisma e **lança erro** se qualquer query em modelo de loja não filtrar por `storeId`. Nunca injeta o filtro sozinho — as rotas precisam ser explícitas.
- Disponibilidade "pagou, usou": fora do trial de 7 dias e sem assinatura ativa, o catálogo público responde 503 genérico (o cliente final nunca descobre que é cobrança).

## Segurança (resumo)

- JWT expira em 1 dia; `JWT_SECRET` é obrigatório em produção.
- Roles `OWNER`/`STAFF` com guarda server-side (`requireOwner`); super-admin só via flag manual no banco.
- Rate limiting global (300 req/min) + limites por rota (login 10/min com limite extra por e-mail).
- Aritmética de pedidos validada **no servidor** (preço unitário conferido contra o banco, com promoções e cupons).
- Erros 5xx sempre mascarados (`"Erro interno do servidor"`).
- Verificação de e-mail obrigatória após 7 dias; reset de senha com token de uso único (1h).

Detalhes completos, riscos aceitos e decisões de design: veja a wiki em [`docs/notion/`](docs/notion/00-inicio.md) e o [`CLAUDE.md`](CLAUDE.md).

## Grafos de código (graphify)

O projeto tem grafos de código gerados pelo [graphify](https://pypi.org/project/graphifyy/) para navegação e análise de impacto:

- Backend: `apps/api/graphify-out/` (graph.json, graph.html, GRAPH_REPORT.md)
- Web: `apps/web/graphify-out/`

```bash
graphify update apps/api                       # reconstruir o grafo do backend
graphify explain "resolveStore" --graph apps/api/graphify-out/graph.json
graphify affected "tenant-guard" --graph apps/api/graphify-out/graph.json
```

## Documentação

| Onde | O quê |
|------|-------|
| [`docs/notion/00-inicio.md`](docs/notion/00-inicio.md) | **Wiki completa** — arquitetura, features, segurança, deploy (pronta para importar no Notion) |
| [`CLAUDE.md`](CLAUDE.md) | Guia técnico para desenvolvimento assistido por IA |
| [`docs/qa/`](docs/qa/00-indice-geral.md) | Roteiros de QA por feature (30 documentos) |
| `docs/*.md` | Planos de implementação, LGPD, relatórios de bugs |

## Deploy

- **Web:** Vercel (Next.js padrão). `NEXT_PUBLIC_API_URL` + wildcard domain `*.plataforma.com` para subdomínios.
- **API:** Vercel (serverless via `src/vercel.ts`) ou VPS (`pnpm build && pnpm start`). Em serverless, configure `REDIS_URL` para o rate limit valer entre instâncias.
