# Handoff — Assinatura recorrente (dia 10), histórico de faturas e inadimplência

> Documento de passagem de contexto (handoff) consolidando o trabalho feito nesta frente.
> Card Trello: **Assinatura recorrente dia 10 + histórico de faturas + desativação por inadimplência** (https://trello.com/c/A2JXbQ9a).
> Cards relacionados: Migração MercadoPago → Stripe (https://trello.com/c/xPUcXr3X) · Melhoria do banner (https://trello.com/c/aMz0YBa6).

## 1. Visão geral

A plataforma migrou o gateway de pagamento de **MercadoPago para Stripe** (corte limpo, sem coexistência) e, sobre isso, ganhou:

- Cobrança recorrente **sempre no dia 10**, com carência no primeiro débito.
- **Histórico de faturas** no painel (`/admin/plano`), 100% Stripe.
- **Desativação automática por inadimplência** + aviso por e-mail + banner no admin.
- **Cron de reconciliação** (dia 10) como rede de segurança dos webhooks.

Estado: **implementado, testado (API 314 testes verdes) e com lint limpo** nos 3 pacotes (`shared`, `api`, `web`).

## 2. Migração MercadoPago → Stripe (base)

- Schema: `Plan.stripeProductId`/`stripePriceId`, `Subscription.stripeSubscriptionId`, `Store.stripeCustomerId` (migration `20260710150000_migracao_mercadopago_para_stripe`).
- Adapter `domain/billing/integrations/stripe.adapter.ts` (`app.stripe`) — no-op sem `STRIPE_SECRET_KEY`; **SDK carregado sob demanda** (lazy import) para não pesar boot/testes.
- Checkout (`mode: subscription`), webhook `POST /api/webhooks/stripe` (raw body + `constructEvent`), CRUD de planos cria `Product`+`Price`, criação de loja (super-admin) gera Checkout Session.
- Dependência trocada (`mercadopago` removido, `stripe` adicionado). Docs/env vars atualizadas. Textos legais (termos/privacidade) atualizados por LGPD.

## 3. Cobrança fixa no dia 10 + carência

`domain/billing/billing-cycle.ts`:

| Função | Fluxo | Regra | Exemplo |
|---|---|---|---|
| `proximoDiaDezUnix(from)` | Autocadastro público | dia 10 do **mês seguinte** | assina 20/jul → 10/ago |
| `primeiroDebitoVendaPresencial(from)` | **Venda presencial** (super-admin) | **30 dias de carência** + próximo dia 10 | compra 20/jul → +30d ≈ 19/ago → **10/set** |

- O valor vira `subscription_data.trial_end` no checkout (`payment_method_collection: 'always'` — coleta o cartão agora, cobra só na âncora). O mês vigente **não** é cobrado.
- Autocadastro usa a regra em `billing.routes.ts` (`subscribe`); venda presencial usa a regra em `super/stores.routes.ts` (`criarAssinaturaComLink`, cobre criar loja e regerar link).

## 4. Webhook (`http/routes/webhooks/stripe.routes.ts`)

- `checkout.session.completed`: vincula `stripeSubscriptionId`/`stripeCustomerId` **sempre**; ativa (`ACTIVE`) quando `payment_status` é `paid` **ou** `no_payment_required` (âncora/trial). `unpaid` (boleto/Pix) fica `PENDING`.
- `customer.subscription.updated`: mapeia status (`active`/`trialing`→ACTIVE, `past_due`/`unpaid`→PAUSED, `canceled`→CANCELLED, `incomplete`→PENDING).
- `customer.subscription.deleted` → CANCELLED (+ notificação).
- `invoice.payment_failed` → **PAUSED** + notificação `SUBSCRIPTION_PAYMENT_FAILED` + **e-mail imediato** ao OWNER (`subscriptionPaymentFailedEmail`, fire-and-forget).

## 5. Inadimplência (desativação + aviso)

- Assinatura fora de `ACTIVE` → loja indisponível ao público automaticamente (regra "pagou, usou" em `store-availability.service.ts`).
- Banner no admin (`app/admin/layout.tsx` → `SubscriptionBanner`): caso `PAUSED` mostra **"Pagamento não efetuado — sua loja está desativada"** com botão para `/admin/plano`.

## 6. Cron de reconciliação (dia 10)

- `GET /api/jobs/verificar-assinaturas` (`http/routes/jobs/billing-reconcile.routes.ts`), auth `CRON_SECRET` (desativado em produção sem o secret).
- Consulta o status real de cada assinatura no Stripe (`app.stripe.getSubscriptionStatus`) e corrige o banco. Rede de segurança caso um webhook se perca.
- Agendado em `apps/api/vercel.json`: `0 4 10 * *`.

## 7. Histórico de faturas (`/admin/plano`)

- `GET /api/billing/invoices?startingAfter=<id>` (admin) — **apenas faturas reais do Stripe** (`app.stripe.listInvoices`, paginação por cursor). Sem `stripeCustomerId` → lista vazia.
- **Importante:** a "cobrança agendada" sintética (derivada do plano/dia 10) que existia foi **removida** por decisão do usuário — nada que não venha do Stripe é exibido.
- Frontend: seção **Faturas** **sempre visível** — carregando → aviso; vazio → **"Nenhuma fatura ainda. Suas cobranças aparecerão aqui."**; com dados → tabela Data/Total/Status/"Ver" (abre `hostedInvoiceUrl`) + "Carregar mais".

## 8. Redesign da tela de Plano (`app/admin/plano/page.tsx`)

- Card **"Plano atual"** enxuto: nome, preço, status e cancelar. O uso virou **uma linha discreta** abaixo do card (`UsageSummary`: `12/50 produtos · 2/2 usuários · 30/100 pedidos`, laranja/vermelho perto/no limite).
- **Trocar de plano** deixou de ser acordeão e virou um **modal** (`ChangePlan` + `PlansModal`, padrão de modal do projeto): botão discreto → modal com fade/zoom, fecha em clicar-fora / X / Esc. Só para OWNER.

## 9. Perfil da loja — banner comentado

- O bloco de **Banner** em `app/admin/perfil/page.tsx` foi **comentado** (oculto do painel, preservado para reativação). Campos `bannerUrl`/`bannerMobileUrl`/`bannerLink` continuam no formulário/tipo/banco.
- Ticket de melhoria: https://trello.com/c/aMz0YBa6.

## 10. Correções de segurança/qualidade (revisões durante o desenvolvimento)

1. **Fail-closed do webhook:** em produção, `STRIPE_SECRET_KEY` sem `STRIPE_WEBHOOK_SECRET` recusa o boot; a rota também nega (500) evento não assinado em produção. Evita forjar `checkout.session.completed` e ativar assinatura de graça.
2. **Ativação só com pagamento:** `checkout.session.completed` só marca `ACTIVE` com `paid`/`no_payment_required`; boleto/Pix `unpaid` fica `PENDING` (sem janela de acesso grátis).
3. **Sem vazar IDs internos do Stripe:** `/current`, `/subscribe`, `/cancel` usam `PLAN_PUBLIC_SELECT` (sem `stripeProductId`/`stripePriceId`).

## 11. Variáveis de ambiente / ops

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (substituem `MERCADOPAGO_*`).
- `CRON_SECRET` obrigatório em produção para os jobs (`limpeza-lgpd` e `verificar-assinaturas`).
- Configurar no Stripe os eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
- Recomendado testar o fluxo `trial_end` + coleta de cartão no **Stripe test mode** ponta a ponta.

## 12. Decisões tomadas / premissas

- Migração em **corte limpo** (sem migrar assinaturas antigas do MercadoPago). Antes de produção, conferir que não há `Subscription` real `ACTIVE/PENDING/PAUSED` no MercadoPago.
- Autocadastro: **dia 10 do mês seguinte para qualquer dia** de assinatura (o requisito só especificava dias 1–9; dias ≥10 assumidos como mês seguinte).

## 13. Pontos em aberto (a confirmar)

1. **Próxima cobrança durante a carência:** como agora só há faturas reais do Stripe, no período de carência a seção Faturas mostra "Nenhuma fatura ainda" — o lojista não vê a data do 1º débito até o Stripe emitir. Opção legítima (dado real do Stripe): exibir a **fatura futura** via `stripe.invoices.upcoming`. **Não implementado** — aguardando decisão.
2. **Regra do autocadastro para dias ≥10:** confirmar se deve seguir "dia 10 do mês seguinte" ou ter carência como a presencial.

## 14. Arquivos-chave

- `apps/api/src/domain/billing/billing-cycle.ts` (+ teste) — âncoras de cobrança.
- `apps/api/src/domain/billing/integrations/stripe.adapter.ts` — `app.stripe` (checkout, invoices, subscription status, webhook verify).
- `apps/api/src/http/routes/billing/billing.routes.ts` (+ teste) — `/current`, `/invoices`, `/subscribe`, `/cancel`.
- `apps/api/src/http/routes/webhooks/stripe.routes.ts` (+ teste) — eventos.
- `apps/api/src/http/routes/jobs/billing-reconcile.routes.ts` (+ teste) — cron.
- `apps/api/src/http/routes/super/stores.routes.ts` — venda presencial.
- `apps/api/src/shared/email/templates.ts` — `subscriptionPaymentFailedEmail`.
- `apps/web/src/app/admin/plano/page.tsx` + `page.hooks.ts` — tela de Plano, Faturas, modal de troca.
- `apps/web/src/app/admin/layout.tsx` — `SubscriptionBanner` (inadimplência).
- `apps/web/src/app/admin/perfil/page.tsx` — banner comentado.
- Docs: `docs/plano-migracao-stripe.md`, `docs/notion/08-billing.md`, doc.md de billing/webhooks/domain-billing.

## 15. Como validar

```bash
pnpm lint                              # tsc nos 3 pacotes
pnpm --filter @esqueleton/api test     # 314 testes
```

Verificação manual sugerida (Stripe test mode): assinar um plano pago → conferir `trial_end` na assinatura do Stripe → forçar `invoice.payment_failed` (Stripe CLI) → conferir PAUSED + e-mail + banner → rodar `GET /api/jobs/verificar-assinaturas` e conferir reconciliação.
