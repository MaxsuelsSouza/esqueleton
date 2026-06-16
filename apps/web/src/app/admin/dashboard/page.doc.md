# Dashboard

Visao geral da loja com resumo de entidades, confirmacao de pedidos, analytics detalhado e produtos recentes.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza os cards de resumo, secao de confirmar pedido, painel de analytics com abas (produtos, promocoes, cupons, destaques, pedidos), lista de produtos recentes e atalhos rapidos. Contem diversos sub-componentes internos (StatCard, MetricCard, ProductFunnelSection, PromotionMetricsSection, CouponMetricsSection, FeaturedMetricsSection, PedidosSection, OrderRow, PhonePopover). |
| `page.hooks.ts` | Carrega estatisticas da loja (totais de produtos, categorias, promocoes, cupons, destaques) e o resumo de analytics da API. Gerencia busca de pedidos por numero, atualizacao de status de pedidos e limpeza do funil de analytics. |

## Fluxo de dados

1. `useDashboardPage()` executa `loadStats()` e `loadAnalytics()` ao montar.
2. `loadStats()` chama em paralelo: `catalogService.listProducts` (5 mais recentes), `categoriesService.listCategories`, `promotionsService.listPromotions`, `couponsService.listCoupons`, `featuredService.listFeatured` → monta o objeto `DashboardStats` com totais e produtos recentes.
3. `loadAnalytics()` chama `analyticsService.getSummary` → retorna `AnalyticsSummary` com metricas globais e por produto/promocao/cupom/destaque.
4. Se a URL contem `?pedido=XXXXXX` (vindo de uma notificacao), o hook busca automaticamente o pedido e rola a tela ate a secao.
5. A aba "Pedidos" no painel de analytics tem seu proprio estado interno (`PedidosSection`) que chama `ordersService.listAll` e `ordersService.updateStatus`.

## Estados gerenciados

| Estado | Tipo | Descricao |
|--------|------|-----------|
| `stats` | `DashboardStats \| null` | Totais de entidades e produtos recentes |
| `analytics` | `AnalyticsSummary \| null` | Dados completos de analytics (metricas globais e por entidade) |
| `isLoadingStats` | `boolean` | Indica carregamento dos totais |
| `isLoadingAnalytics` | `boolean` | Indica carregamento dos analytics |
| `analyticsTab` | `'produtos' \| 'promocoes' \| 'cupons' \| 'destaques' \| 'pedidos'` | Aba ativa no painel de analytics |
| `orderSearch` | `string` | Numero do pedido digitado na busca |
| `foundOrder` | `Order \| null` | Pedido encontrado pela busca |
| `orderSearchError` | `string \| null` | Mensagem de erro na busca de pedido |
| `isSearchingOrder` | `boolean` | Indica busca de pedido em andamento |
| `isUpdatingOrder` | `boolean` | Indica atualizacao de status em andamento |

## Acoes do usuario

| Acao | Handler | O que faz |
|------|---------|-----------|
| Buscar pedido por numero | `searchOrder` | Chama `ordersService.searchByNumber` e exibe o pedido encontrado |
| Confirmar venda / Nao vendido | `updateOrderStatus` | Chama `ordersService.updateStatus` e recarrega analytics |
| Trocar aba de analytics | `setAnalyticsTab` | Alterna entre produtos, promocoes, cupons, destaques e pedidos |
| Limpar dados do funil | `clearFunnel` | Chama `analyticsService.clearEvents` apos confirmacao |
| Confirmar/rejeitar pedido na aba Pedidos | `handleUpdateStatus` (PedidosSection) | Atualiza status do pedido na lista interna |

## Modulos utilizados

- `@/modules/catalog/services/catalog.service` — listar produtos (totais e recentes)
- `@/modules/categories/services/categories.service` — contar categorias
- `@/modules/promotions/services/promotions.service` — contar promocoes ativas
- `@/modules/coupons/services/coupons.service` — contar cupons ativos
- `@/modules/featured/services/featured.service` — contar destaques ativos
- `@/modules/analytics/services/analytics.service` — resumo de analytics e limpeza de eventos
- `@/modules/orders/services/orders.service` — busca e atualizacao de pedidos
- Mocks de todos os modulos acima (usados quando `USE_MOCK_DATA = true`)

## Observacoes

- A flag `USE_MOCK_DATA` esta `false` (dados reais da API).
- O parametro de URL `?pedido=XXXXXX` permite deep-link direto para confirmacao de um pedido (usado pelas notificacoes de novo pedido).
- O ranking de produtos usa um sistema de "saude" com 5 niveis: vendendo, pendente, parado, interesse e sem_dados — cada um com insight textual para o vendedor.
- A aba "Pedidos" agrupa os pedidos por periodo (hoje, ultimos 7 dias, ultimos 30 dias, mais antigos).
- O componente `PhonePopover` exibe um popover com link para o WhatsApp ao passar o mouse ou clicar no telefone do cliente.
- Sub-componentes internos relevantes: `ProductFunnelSection` (filtros de ranking com 6 modos), `PromotionMetricsSection`, `CouponMetricsSection`, `FeaturedMetricsSection`, `PedidosSection` (com estado proprio de carregamento e filtro por status).
