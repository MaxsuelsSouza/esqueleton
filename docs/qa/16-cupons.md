# QA — Cupons de Desconto

**Commits relacionados:** `ebd8824`, `5309619`
**Data:** 2026-06-09, 2026-06-21

## Descrição

Cupons com código de desconto. Admin cria e gerencia; cliente digita o código no catálogo. Validação server-side via `GET /api/lojas/:slug/coupons/codigo/:code`. Cupons podem ter limite de usos, validade e produtos específicos.

## Casos de Teste

### CT-01: Criar cupom
1. Acessar `/admin/cupons`
2. Criar cupom: código "DESCONTO10", 10%, sem limite
3. **Esperado:** Cupom criado. Código unique por loja (storeId + code).

### CT-02: Aplicar cupom no catálogo
1. Digitar "DESCONTO10" no campo de cupom do catálogo
2. **Esperado:** Validado no servidor. Desconto aplicado nos produtos elegíveis.

### CT-03: Cupom com productIds (parcial)
1. Cupom que afeta apenas produtos 1 e 2
2. Aplicar no catálogo
3. **Esperado:** Desconto apenas nos produtos 1 e 2. Demais sem alteração.

### CT-04: Cupom expirado
1. Cupom com data de validade passada
2. Tentar aplicar
3. **Esperado:** Erro — cupom expirado.

### CT-05: Cupom com maxUses atingido
1. Cupom com `maxUses: 5` e `usedCount: 5`
2. Tentar aplicar
3. **Esperado:** Erro — limite de usos atingido.

### CT-06: Incremento de usedCount
1. Criar pedido com cupom válido
2. **Esperado:** `usedCount` incrementado em 1 na criação do pedido (scoped por storeId).

### CT-07: Código inválido
1. Digitar código inexistente
2. **Esperado:** Erro via `couponErrorMessage`.

### CT-08: Cupom inativo
1. Cupom com `active: false`
2. Tentar aplicar
3. **Esperado:** Erro — cupom inativo.

### CT-09: Rate limit do lookup
1. Fazer 21 consultas de código em 1 minuto
2. **Esperado:** Bloqueado após 20 (429).

### CT-10: Cupom com mesmo código em lojas diferentes
1. Loja A e Loja B com cupom "PROMO20"
2. **Esperado:** Funcionam independentemente (unique composto storeId + code).

### CT-11: API admin vs pública
1. `GET /api/coupons` (admin, JWT) — retorna todos
2. `GET /api/lojas/:slug/coupons/codigo/:code` (público) — retorna apenas campos necessários
3. **Esperado:** API pública NÃO expõe todos os cupons.

## Validações (isCouponUsable)

- `active === true`
- Dentro do período de validade (startDate/endDate)
- `usedCount < maxUses` (ou maxUses null = ilimitado)

## Critérios de Aceite

- [ ] CRUD de cupons funciona
- [ ] Validação server-side funciona
- [ ] Cupom com productIds afeta apenas esses produtos
- [ ] maxUses é respeitado
- [ ] usedCount incrementa na criação do pedido
- [ ] API pública não expõe todos os cupons
- [ ] Rate limit no lookup funciona
