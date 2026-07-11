# QA — Planos e Assinatura (Stripe)

**Commits relacionados:** `660303a`, `38c5417`, `0260a2a`
**Data:** 2026-06-12

## Descrição

Planos definem limites (maxProducts, maxUsers, maxOrdersPerMonth). Cada loja tem uma Subscription. Pagamento via Stripe (checkout redirect). Webhook do Stripe valida eventos de pagamento (assinatura verificada pelo SDK).

## Pré-condições

- Planos cadastrados pelo super-admin
- `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` configurados (opcional — sem eles, operações são no-op)

## Casos de Teste

### CT-01: Visualizar plano atual
1. Acessar `/admin/plano`
2. **Esperado:** Plano atual exibido com limites e uso. Mostra quanto falta para cada limite.

### CT-02: Assinar plano (OWNER)
1. Clicar em "Assinar" em um plano pago
2. **Esperado:** Redireciona para checkout Stripe (`session.url`). Subscription criada com status `PENDING`.

### CT-03: Webhook confirma pagamento
1. Stripe envia webhook de pagamento confirmado
2. **Esperado:** Subscription atualizada para `ACTIVE`. Webhook validado pela assinatura do Stripe.

### CT-04: Webhook — falha de pagamento
1. Webhook de falha de pagamento
2. **Esperado:** Subscription → `PAUSED`. Notificação `SUBSCRIPTION_PAYMENT_FAILED` criada.

### CT-05: Cancelar assinatura (OWNER)
1. `POST /api/billing/cancel`
2. **Esperado:** Subscription → `CANCELLED`. Notificação `SUBSCRIPTION_CANCELLED` criada.

### CT-06: Limite de plano atingido — produtos
1. Plano com `maxProducts: 5`
2. Tentar criar o 6º produto
3. **Esperado:** 403 — "Limite do plano atingido".

### CT-07: Limite de plano atingido — usuários
1. Plano com `maxUsers: 2`
2. Tentar convidar o 3º usuário
3. **Esperado:** 403 — limite de usuários (verificado via `app.planLimitStatus` no register).

### CT-08: Limite de plano atingido — pedidos/mês
1. Plano com `maxOrdersPerMonth: 50`
2. Após 50 pedidos no mês
3. **Esperado:** 403 — limite de pedidos mensal atingido.

### CT-09: Notificação de limite próximo (80%)
1. Uso atinge 80% de um limite
2. **Esperado:** Notificação `PLAN_LIMIT_APPROACHING` upserted (entityId = limit key).

### CT-10: Sem assinatura ativa = ilimitado
1. Loja sem subscription ativa (ou limite não definido no plano)
2. **Esperado:** Nunca bloqueia (sem assinatura = unlimited por segurança).

### CT-11: STAFF não pode assinar/cancelar
1. Logar como STAFF
2. Tentar `POST /api/billing/subscribe` ou `cancel`
3. **Esperado:** 403 Forbidden.

### CT-12: Webhook com assinatura inválida
1. Enviar webhook com assinatura inválida
2. **Esperado:** 401 — webhook rejeitado.

### CT-13: Sem STRIPE_SECRET_KEY
1. Rodar API sem a variável
2. Tentar assinar
3. **Esperado:** No-op (sem erro crítico, operação ignorada).

## Página de Onboarding

- `/admin/assinatura` — tela explicativa do trial de 7 dias, como funciona a cobrança, botão para assinar.

## Critérios de Aceite

- [ ] Visualização do plano atual com limites e uso
- [ ] Assinatura redireciona para Stripe
- [ ] Webhook confirma/cancela/pausa assinatura
- [ ] Limites de plano são respeitados (403)
- [ ] Notificação de limite próximo (80%)
- [ ] Sem assinatura = ilimitado
- [ ] Apenas OWNER pode assinar/cancelar
- [ ] Assinatura validada no webhook
