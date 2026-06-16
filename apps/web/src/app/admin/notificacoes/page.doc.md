# Notificacoes

Pagina de listagem de notificacoes do painel admin — pedidos, expiracoes de promocoes/cupons/destaques, alertas de plano e assinatura.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza a lista de notificacoes com abas de filtro (todas, nao lidas, pedidos, expiradas). Cada notificacao exibe icone por tipo, titulo, corpo, tag de tipo, tempo relativo e acoes (marcar como lida, remover). Clicar navega para a pagina relacionada. Sub-componentes: NotificationCard, OrderMetadata (exibe telefone e total do pedido com botao de copiar). |
| `page.hooks.ts` | Carrega notificacoes da API (com verificacao de expiracoes antes), gerencia filtros por aba, marcar como lida (individual e em lote), exclusao e navegacao. Exporta configuracao visual por tipo (`TYPE_CONFIG`) e funcao `timeAgo`. |

## Fluxo de dados

1. `useNotificacoesPage()` chama `notificationsService.checkExpiry` (fire-and-forget) e depois `notificationsService.list` ao montar.
2. As notificacoes sao filtradas localmente conforme a aba ativa.
3. Ao marcar como lida, chama `notificationsService.markRead` e atualiza localmente. Dispara `window.dispatchEvent(new Event('notifications-read'))` para o sino de notificacoes atualizar o badge.
4. Ao clicar em uma notificacao, marca como lida automaticamente e navega para a pagina relacionada via `router.push`.

## Estados gerenciados

| Estado | Tipo | Descricao |
|--------|------|-----------|
| `notifications` | `Notification[]` | Lista completa de notificacoes |
| `isLoading` | `boolean` | Indica carregamento |
| `activeTab` | `'todas' \| 'nao_lidas' \| 'pedidos' \| 'expiradas'` | Aba de filtro ativa |
| `filtered` | `Notification[]` | Notificacoes filtradas pela aba (calculado) |
| `unreadCount` | `number` | Quantidade de nao lidas (calculado) |

## Acoes do usuario

| Acao | Handler | O que faz |
|------|---------|-----------|
| Trocar aba | `setActiveTab` | Filtra notificacoes por tipo |
| Marcar todas como lidas | `handleMarkAllRead` | Chama `notificationsService.markAllRead` e atualiza localmente |
| Marcar uma como lida | `handleMarkRead` | Chama `notificationsService.markRead` e dispara evento para o sino |
| Remover notificacao | `handleDelete` | Chama `notificationsService.delete` e remove da lista |
| Clicar na notificacao | `handleNavigate` | Marca como lida e navega para a pagina correspondente |
| Copiar telefone do pedido | `OrderMetadata.copyPhone` | Copia numero para a area de transferencia |

## Modulos utilizados

- `@/modules/notifications/services/notifications.service` — listar, marcar como lida, marcar todas, excluir e verificar expiracoes

## Observacoes

- A verificacao de expiracoes (`checkExpiry`) cria notificacoes automaticas para promocoes, cupons e destaques que venceram.
- Os tipos de notificacao com suas rotas de navegacao:
  - `NEW_ORDER` → `/admin/dashboard?pedido=<entityId>`
  - `PLAN_LIMIT_APPROACHING` → `/admin/plano`
  - `SUBSCRIPTION_REQUIRED`, `SUBSCRIPTION_CANCELLED`, `SUBSCRIPTION_PAYMENT_FAILED` → `/admin/assinatura`
  - `PROMOTION_ENDED` → `/admin/promocoes`
  - `COUPON_ENDED` → `/admin/cupons`
  - `FEATURED_ENDED` → `/admin/destaques`
- O evento `notifications-read` e disparado via `window.dispatchEvent` para sincronizar o badge do sino de notificacoes no layout admin.
- Notificacoes de pedido (`NEW_ORDER`) exibem telefone do cliente e valor total extraidos do campo `metadata` (JSON).
- A funcao `timeAgo` exibe tempo relativo: "agora mesmo", "ha X min", "ha Xh", "ha X dias".
