# domain/analytics/ — Métricas do dashboard

Agregação de dados de eventos e pedidos para o painel do lojista.

## Arquivos

### `services/analytics.service.ts`

| Export | O que faz |
|--------|-----------|
| `computeAnalyticsSummary(prisma, storeId)` | Calcula todas as métricas do dashboard |

Função de ~270 linhas que processa em paralelo:
- **Eventos de produto** (`productEvent`) — visualizações, adições ao carrinho, envios por WhatsApp, cópias de link, favoritos
- **Pedidos** (`order`) — vendidos, pendentes, todos

**Métricas calculadas:**
- **Funil de conversão:** views → cart adds → WhatsApp sends
- **Top produtos:** ranking por interações
- **Desempenho de promoções:** quais promoções geraram mais conversões
- **Desempenho de destaques:** cliques e conversões por seção em destaque
- **Cupons:** pedidos com e sem cupom

**Otimização:** busca todos os dados de uma vez com `Promise.all` e processa em memória — evita múltiplas queries ao banco.

```typescript
// Uso na rota GET /api/analytics
const summary = await computeAnalyticsSummary(app.prisma, storeId)
return summary
```
