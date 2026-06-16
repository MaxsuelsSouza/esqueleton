# Assinatura

Onboarding de ativação da loja — explica o modelo "pagou, usou", mostra a situação do período de teste e leva o proprietário ao pagamento recorrente via MercadoPago.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza o banner de situação (teste vigente, teste vencido ou pagamento pendente), a explicação em 3 passos de como funciona a assinatura, e a grade de planos pagos disponíveis com botão de assinar. Se já há assinatura ativa, mostra tela de sucesso com link para `/admin/plano`. |
| `page.hooks.ts` | Carrega dados de billing e lista de planos (filtrando apenas pagos), gerencia a ação de assinar com redirecionamento para o checkout MercadoPago, e deriva estados como `hasActiveSubscription`, `isPending` e `trial`. |

## Fluxo de dados

`useAdminAuth` fornece `token` e `isOwner` → `billingService.current(token)` retorna assinatura + trial → `billingService.listPlans()` retorna todos os planos, filtrados para manter apenas `priceInCents > 0` → hook deriva `trial`, `hasActiveSubscription`, `isPending` → view renderiza o banner adequado e os planos.

Ao assinar: `billingService.subscribe(planId, token)` → se retorna `checkoutUrl`, redireciona para o MercadoPago; senão, marca `pendingMessage` como true e recarrega os dados.

## Estados gerenciados

| Estado | Tipo | Descrição |
|--------|------|-----------|
| `billing` | `BillingCurrentResponse \| null` | Dados completos de billing da loja |
| `plans` | `Plan[]` | Planos pagos disponíveis (gratuitos são filtrados) |
| `loading` | `boolean` | Indica carregamento inicial dos dados |
| `error` | `string \| null` | Mensagem de erro |
| `subscribingId` | `string \| null` | ID do plano sendo assinado (desabilita botões durante o processo) |
| `pendingMessage` | `boolean` | Exibe aviso de pagamento em processamento quando não há URL de checkout |

## Ações do usuário

| Ação | Handler | O que faz |
|------|---------|-----------|
| Clicar em "Assinar e ativar" num plano | `handleSubscribe(plan)` | Chama `billingService.subscribe`. Se retorna `checkoutUrl`, redireciona para o checkout seguro do MercadoPago. Caso contrário (dev sem MercadoPago), exibe banner de pagamento pendente. |

## Módulos utilizados

- `@/modules/auth` — `useAdminAuth` para token JWT, role e estado de carregamento.
- `@/modules/billing` — `billingService` para `current` (dados atuais) e `listPlans` (planos disponíveis) e `subscribe` (iniciar assinatura).
- `@esqueleton/shared` — tipos `Plan` e `BillingCurrentResponse`.

## Observações

- Apenas o OWNER vê os botões de assinar. Membros STAFF veem um aviso: "Apenas o proprietário da loja pode ativar a assinatura."
- A página exibe apenas planos pagos (`priceInCents > 0`), diferente da página de Plano que mostra todos.
- Três cenários de banner: (1) teste ativo com dias restantes (laranja), (2) teste vencido e loja fora do ar (vermelho), (3) pagamento em processamento (azul).
- Se a loja já tem assinatura ativa (`hasActiveSubscription`), a página exibe apenas uma mensagem de sucesso com link para `/admin/plano`.
- O cadastro do cartão acontece no checkout seguro do MercadoPago (fora do sistema). Quando o pagamento é aprovado, o webhook ativa a assinatura automaticamente.
