# QA — Analytics e Ranking de Produtos

**Commits relacionados:** `73d0097`
**Data:** 2026-06-14

## Descrição

Dashboard de analytics com ranking de produtos por diferentes métricas. Filtros por período e métrica. Endpoints públicos (por slug) e admin (por JWT).

## Casos de Teste

### CT-01: Visualizar analytics (admin)
1. Acessar dashboard de analytics no admin
2. **Esperado:** Resumo com métricas da loja (vendas, pedidos, produtos).

### CT-02: Ranking de produtos
1. Acessar ranking de produtos
2. **Esperado:** Produtos ordenados pela métrica selecionada.

### CT-03: Filtro por métrica
1. Alternar entre métricas (vendas, visualizações, favoritos)
2. **Esperado:** Ranking reordenado conforme métrica.

### CT-04: Analytics público
1. `GET /api/lojas/:slug/analytics`
2. **Esperado:** Dados públicos da loja retornados. Rate limit: 120/min.

### CT-05: Analytics admin
1. `GET /api/analytics` com JWT
2. **Esperado:** Dados completos da loja do token.

### CT-06: Função computeAnalyticsSummary
1. Verificar cálculos de agregação
2. **Esperado:** ~270 linhas de agregação retornam dados corretos.

## Critérios de Aceite

- [ ] Dashboard exibe métricas corretas
- [ ] Ranking filtrável por métrica
- [ ] Rate limit no endpoint público (120/min)
- [ ] Dados isolados por loja
