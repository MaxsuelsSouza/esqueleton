# Plano

Exibe a assinatura atual da loja, o consumo dos limites do plano e os planos disponíveis para troca ou cancelamento.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza o plano atual (nome, preço, status), os cartões de uso (produtos, usuários, pedidos) com barra de progresso, e a grade de planos disponíveis com botões de assinar/cancelar. Inclui o sub-componente `UsageCard`. |
| `page.hooks.ts` | Carrega os dados de billing (assinatura + uso) e a lista de planos via `billingService`. Gerencia as ações de assinar (com redirecionamento para checkout MercadoPago) e cancelar, além dos estados de loading, erro e feedback. |

## Fluxo de dados

`useAdminAuth` fornece `token` e `isOwner` → `billingService.current(token)` retorna assinatura + uso + trial → `billingService.listPlans()` retorna planos disponíveis → hook deriva `subscription`, `usage`, `currentPlan` e `isPaidPlan` → view renderiza os dados.

Ao assinar: `billingService.subscribe(planId, token)` → se retorna `checkoutUrl`, redireciona para o MercadoPago; senão, recarrega os dados.

Ao cancelar: `billingService.cancel(token)` → exibe mensagem de feedback → recarrega os dados.

## Estados gerenciados

| Estado | Tipo | Descrição |
|--------|------|-----------|
| `billing` | `BillingCurrentResponse \| null` | Resposta completa da API de billing (assinatura, uso, trial) |
| `plans` | `Plan[]` | Lista de planos disponíveis na plataforma |
| `loading` | `boolean` | Indica se os dados ainda estão sendo carregados |
| `error` | `string \| null` | Mensagem de erro exibida ao usuário |
| `feedback` | `string \| null` | Mensagem de sucesso (ex: "Plano alterado para X") |
| `subscribingId` | `string \| null` | ID do plano sendo assinado no momento (desabilita botões) |
| `cancelling` | `boolean` | Indica se o cancelamento está em andamento |

## Ações do usuário

| Ação | Handler | O que faz |
|------|---------|-----------|
| Clicar em "Assinar" num plano | `handleSubscribe(plan)` | Pede confirmação, chama `billingService.subscribe`. Se pago, redireciona para checkout MercadoPago. Se gratuito, troca e recarrega. |
| Clicar em "Cancelar assinatura" | `handleCancel` | Pede confirmação, chama `billingService.cancel`, exibe feedback e recarrega os dados. |

## Módulos utilizados

- `@/modules/auth` — `useAdminAuth` para token JWT, verificação de role (OWNER) e estado de carregamento da autenticação.
- `@/modules/billing` — `billingService` para buscar dados de billing (`current`), listar planos (`listPlans`), assinar (`subscribe`) e cancelar (`cancel`).
- `@esqueleton/shared` — tipos `Plan` e `BillingCurrentResponse`.

## Observações

- Apenas o OWNER vê os botões de "Assinar" e "Cancelar assinatura". Membros STAFF visualizam o plano e o uso, mas sem ações.
- O botão de cancelar só aparece para assinaturas ativas de planos pagos (`isPaidPlan && subscription.status === 'ACTIVE'`).
- O status da assinatura (PENDING, PAUSED, CANCELLED) aparece em destaque laranja quando diferente de ACTIVE.
- Os cartões de uso (`UsageCard`) mudam de cor conforme a proximidade do limite: cinza (normal), laranja (a partir de 80%) e vermelho (100%).
- Limites com valor `null` ou `undefined` são exibidos como "Ilimitado" e sem barra de progresso.
