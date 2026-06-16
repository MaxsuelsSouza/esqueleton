# Super Admin - Metricas da Plataforma

Pagina de visao geral do SaaS com totais de lojas, usuarios, receita recorrente (MRR) e distribuicao de assinaturas por plano.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza cinco cartoes de metricas (Lojas, Ativas, Suspensas, Usuarios, MRR) e um grafico de barras horizontais com assinaturas ativas por plano. Inclui sub-componente `MetricCard`. |
| `page.hooks.ts` | Carrega metricas via `superService.metrics(token)` e calcula `maxCount` (maior contagem entre planos) para dimensionar as barras do grafico. |

## Fluxo de dados

`useAdminAuth()` verifica token e `isSuperAdmin` → redireciona se nao for super-admin → `superService.metrics(token)` busca metricas agregadas da API → `maxCount` e derivado de `metrics.subscriptionsByPlan` → dados chegam a view como objeto `metrics`.

## Estados gerenciados

| Estado | Tipo | Descricao |
|--------|------|-----------|
| `metrics` | `PlatformMetrics \| null` | Objeto com totais e assinaturas por plano |
| `loading` | `boolean` | Carregamento inicial |
| `error` | `string \| null` | Mensagem de erro ao carregar |

## Acoes do usuario

| Acao | Handler | O que faz |
|------|---------|-----------|
| — | — | Pagina somente leitura, sem interacoes alem da navegacao |

## Modulos utilizados

- `@/modules/auth/hooks/useAdminAuth` — verifica autenticacao e flag `isSuperAdmin`
- `@/modules/super/services/super.service` — chamada `metrics` da API de super-admin
- `@esqueleton/shared` — tipo `PlatformMetrics`

## Observacoes

- Acesso restrito a super-admins.
- O MRR (Monthly Recurring Revenue) e exibido em reais, convertido de centavos via `formatPrice`.
- O grafico de barras usa `maxCount` como referencia para a largura proporcional de cada barra.
- `MetricCard` e um sub-componente interno que renderiza icone, rotulo e valor; aceita `accent` para cor customizada.
- Se nao houver assinaturas ativas, exibe a mensagem "Nenhuma assinatura ativa ainda."
