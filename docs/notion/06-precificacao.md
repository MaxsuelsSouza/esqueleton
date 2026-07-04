# 06 — Precificação (Promoções, Cupons e Destaques)

[← Voltar ao início](00-inicio.md)

## Promoções

Modelo `Promotion`: tipo (apenas um **rótulo** — desconto, kit, compre X leve Y…), desconto, horário e período opcionais. Todos os campos ficam sempre disponíveis no formulário — o tipo não trava nada.

- **Admin:** `/admin/promocoes` (CRUD). `GET /api/promotions` (JWT) retorna tudo da loja do token.
- **Público:** `GET /api/lojas/:slug/promotions` retorna **apenas `active: true`** daquela loja.
- **Aplicação no catálogo:** `applyPromotionsToProducts` (web, `utils/promotions.ts`) modifica os preços exibidos e adiciona o badge. `isPromotionActive` confere datas e horários.

## Cupons

Modelo `Coupon`: código, desconto, limite de usos (`maxUses` / `usedCount`), validade, e `productIds` opcional (cupom restrito a certos produtos).

### Segurança — por que a lista é protegida

`GET /api/coupons` e `GET /api/coupons/:id` **exigem JWT** — a listagem exporia todos os códigos de desconto da loja.

O checkout público usa **apenas** `GET /api/lojas/:slug/coupons/codigo/:code` (rate limit 20/min), que:

- Valida server-side: ativo, dentro das datas, `usedCount < maxUses` (`isCouponUsable` em `domain/pricing/`).
- Retorna **só os campos necessários** para aplicar o desconto — nunca os demais cupons.

### Aplicação no catálogo

O cliente digita o código num campo acima do catálogo → validação no servidor → `applyCouponToProduct` sobrescreve o preço dos produtos elegíveis (cupons com `productIds` não vazios afetam apenas esses produtos). Mensagens de erro amigáveis via `couponErrorMessage`.

### Contagem de uso

O `usedCount` é incrementado **no servidor** quando um pedido é criado (`POST /api/lojas/:slug/orders`), escopado à loja — é isso que torna o `maxUses` confiável. Ver [Pedidos](07-pedidos.md).

## Destaques (Featured)

Seções "Em destaque" no topo do catálogo.

- **Admin:** `GET /api/featured` (JWT) lista tudo da loja.
- **Público:** `GET /api/lojas/:slug/featured` retorna apenas `active: true`.
- **Exibição:** `getActiveFeatured` (web, `utils/featured.ts`) escolhe a **primeira** featured com `active === true` e data/horário dentro do intervalo. Sem nenhuma ativa, o banner some.

## Ordem de aplicação no catálogo público

> Esta ordem importa e está implementada em `loja/[slug]/page.tsx`:

```
1. Promoções   → mudam o preço base exibido
2. Cupom       → sobrescreve o preço dos produtos elegíveis
3. Filtros/ordenação → sobre o resultado final
```

A mesma lógica (promoções + cupons, com tolerância de 1 centavo) é **revalidada no servidor** quando o pedido chega — ver [Pedidos](07-pedidos.md).

## Notificações de expiração

`checkExpiredEntities` (`domain/notification/notification.service.ts`) detecta promoções, cupons e destaques **expirados** e gera notificações para o painel, dedupadas pelo unique `storeId+type+entityId`.

## Próxima página

→ [07 — Pedidos](07-pedidos.md)
