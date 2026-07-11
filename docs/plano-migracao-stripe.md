# Plano: Migração MercadoPago → Stripe

## Contexto

A cobrança da plataforma hoje usa o MercadoPago (`PreApprovalPlan` + `PreApproval`) para assinaturas recorrentes dos planos pagos. Este documento planeja a substituição completa pelo Stripe.

**Decisão do usuário:** corte limpo — sem período de coexistência dos dois gateways, sem migração de assinaturas antigas do MercadoPago. Premissa: não há assinantes pagantes reais em produção hoje (projeto em estágio de skeleton/testes). **Antes de rodar a migração em produção, confirmar rodando uma query em `Subscription` com `status IN ('ACTIVE','PENDING','PAUSED')` — se houver linhas, essa premissa precisa ser revisada antes de prosseguir.**

## Mapeamento de conceitos

| MercadoPago | Stripe |
|---|---|
| `PreApprovalPlan` (plano de recorrência) | `Product` + `Price` (recorrente) |
| `PreApproval` (assinatura individual) | `Checkout Session` (`mode: subscription`) → gera `Subscription` |
| `init_point` (URL de checkout hospedado) | `session.url` |
| Webhook com HMAC manual (`x-signature`) | `stripe.webhooks.constructEvent` (verificação nativa do SDK) |
| Link de pagamento avulso (venda presencial pelo super-admin) | `Checkout Session` server-side com `customer_email` pré-preenchido |
| Sem conceito de customer estável | `Store.stripeCustomerId` (novo — necessário para reaproveitar o customer em trocas de plano) |

## Arquivos afetados

### Backend (`apps/api`)

| Arquivo | Ação |
|---|---|
| `prisma/schema.prisma` | `Plan`: remove `mercadoPagoPreapprovalPlanId`, adiciona `stripeProductId`, `stripePriceId`. `Subscription`: remove `mercadoPagoPreapprovalId`, adiciona `stripeSubscriptionId`. `Store`: adiciona `stripeCustomerId`. |
| `domain/billing/integrations/mercadopago.adapter.ts` | Deletar |
| `domain/billing/integrations/stripe.adapter.ts` | Criar — plugin `app.stripe`, no-op sem `STRIPE_SECRET_KEY` |
| `http/routes/billing/billing.routes.ts` | `subscribe`/`cancel` passam a usar Checkout Session e `stripe.subscriptions.cancel` |
| `http/routes/webhooks/mercadopago.routes.ts` | Deletar |
| `http/routes/webhooks/stripe.routes.ts` | Criar — `POST /api/webhooks/stripe`, raw body + `constructEvent` |
| `http/routes/webhooks/index.ts` | Atualizar barrel |
| `http/routes/super/plans.routes.ts` | CRUD de planos cria `Product`/`Price` no Stripe em vez de `PreApprovalPlan` |
| `http/routes/super/stores.routes.ts` | `criarAssinaturaComLink` gera Checkout Session em vez de link MP |
| `app.ts` | Troca registro do plugin `mercadopagoPlugin` por `stripePlugin` |
| `package.json` | Remove `mercadopago`, adiciona `stripe` |
| Testes (`mercadopago.test.ts`, `stores.test.ts`) | Recriar como `stripe.test.ts`; atualizar mocks de `app.mercadopago` → `app.stripe` |

### Tipos compartilhados

| Arquivo | Ação |
|---|---|
| `packages/shared/src/index.ts` | `SuperPlan.mercadoPagoPreapprovalPlanId` → `stripePriceId`; comentários atualizados |

### Frontend (`apps/web`) — apenas texto/comentário, contrato de API não muda

- `modules/billing/services/billing.service.ts`
- `app/admin/assinatura/page.hooks.ts`, `page.tsx`, `page.doc.md`
- `app/admin/plano/page.hooks.ts`, `page.tsx`, `page.doc.md`
- `app/admin/super/planos/page.tsx`
- `app/admin/super/lojas/page.tsx`
- `app/termos/page.tsx`, `app/privacidade/page.tsx` — obrigatório por transparência LGPD sobre o processador de pagamento

### Documentação

- `CLAUDE.md` (raiz e `apps/api/CLAUDE.md`)
- `docs/notion/08-billing.md`, `09-super-admin.md`, `13-seguranca.md`, `14-deploy-e-ambientes.md`, `01-visao-geral.md`, `02-arquitetura.md`, `00-inicio.md`
- `docs/qa/22-planos-e-assinatura.md`, `24-super-admin.md`
- `README.md`

## Variáveis de ambiente

```diff
- MERCADOPAGO_ACCESS_TOKEN=
- MERCADOPAGO_WEBHOOK_SECRET=
+ STRIPE_SECRET_KEY=sk_...
+ STRIPE_WEBHOOK_SECRET=whsec_...
```

## Fases de implementação

### Fase 1 — Schema (Prisma)
Migração única alterando `Plan`, `Subscription` e `Store` conforme tabela acima. Sem preservação de dados MP (corte limpo).

### Fase 2 — Adapter Stripe
Novo `stripe.adapter.ts` espelhando o padrão do adapter atual: plugin Fastify, no-op sem credencial, interface de serviço (`createProductWithPrice`, `createCheckoutSession`, `cancelSubscription`, `isConfigured`).

### Fase 3 — Rotas de billing
`POST /subscribe` cria/reaproveita `stripeCustomerId` da loja e cria uma Checkout Session; `POST /cancel` cancela via API do Stripe; `GET /current` permanece inalterado (já é agnóstico de gateway).

### Fase 4 — Webhook Stripe
Novo `POST /api/webhooks/stripe`, validação via `stripe.webhooks.constructEvent`. Requer content-type parser dedicado para preservar o raw body nessa rota (Stripe exige o corpo bruto para validar assinatura — diferente do parser JSON global do Fastify usado nas demais rotas). Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Mesmo padrão atual: `prismaRaw`, sempre responde 200.

### Fase 5 — CRUD de planos (super-admin)
Criar/editar plano paga cria `Product` + `Price` no Stripe. Como `Price` é imutável, mudança de valor/período recria o `Price` (mesma lógica que já existe hoje para o MP).

### Fase 6 — Criação de loja pelo super-admin
`criarAssinaturaComLink` passa a gerar uma Checkout Session com e-mail do dono pré-preenchido.

### Fase 7 — Frontend
Apenas texto (labels, comentários, páginas legais). Contrato `checkoutUrl`/`paymentLink` preservado — zero mudança funcional no frontend.

### Fase 8 — Limpeza
Remove todo código, dependência, variável de ambiente e documentação do MercadoPago.

### Fase 9 — Testes
Recriar suíte de testes do adapter/webhook para Stripe; atualizar mocks em `stores.test.ts`.

## Riscos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Raw body do webhook conflitando com parser JSON global do Fastify | Média | Content-type parser dedicado só na rota do webhook, registrado antes do parser global |
| Premissa de corte limpo incorreta (assinantes reais existentes) | Baixa, não confirmada | Checar `Subscription.status IN ('ACTIVE','PENDING','PAUSED')` antes de migrar produção |
| Textos legais desatualizados | Alta se esquecido | Fase 7 cobre explicitamente `termos`/`privacidade` |
| `Price` imutável exige recriação a cada mudança de valor | Baixa (já é o comportamento com MP) | Mesma lógica já implementada, só troca a chamada de API |

## Complexidade estimada: MÉDIA

Arquitetura 1:1 com o padrão MercadoPago existente (adapter plugin, rotas público/admin, webhook via `prismaRaw`) — troca de integração, não redesenho. Superfície: ~10 arquivos de código na API, ~6 de frontend (só texto), ~8 documentos.
