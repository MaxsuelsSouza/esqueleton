# QA — Criação e Gestão de Pedidos

**Commits relacionados:** `ead9e8e`, `ebd8824`
**Data:** 2026-06-09, 2026-06-23

## Descrição

Pedidos são criados via `POST /api/lojas/:slug/orders` com validação aritmética completa no servidor. O admin tem uma página de gestão de pedidos. O `orderNumber` é gerado client-side (unique constraint).

## Casos de Teste

### CT-01: Criar pedido
1. Na sacola, confirmar pedido
2. **Esperado:** Pedido criado com itens, quantidades, preços. `orderNumber` gerado.

### CT-02: Validação aritmética server-side
1. Pedido com `lineTotal != unitPrice × quantity`
2. **Esperado:** 400 — aritmética inválida.

### CT-03: Validação de subtotal
1. Pedido com `subtotal != sum(lineTotals)`
2. **Esperado:** 400 — subtotal incorreto.

### CT-04: Validação de total
1. Pedido com `total != subtotal - discount`
2. **Esperado:** 400 — total incorreto.

### CT-05: Validação de unitPrice contra banco
1. Pedido com preço manipulado (diferente do produto no banco)
2. **Esperado:** 400 — preço não corresponde (tolerância de 1 centavo para arredondamento).

### CT-06: unitPrice com promoção ativa
1. Produto com promoção de 20%
2. Pedido com unitPrice = preço com desconto
3. **Esperado:** Aceito — servidor valida contra preço promocional.

### CT-07: unitPrice com cupom
1. Pedido usando cupom
2. **Esperado:** Servidor valida unitPrice considerando o desconto do cupom.

### CT-08: Página de gestão no admin
1. Acessar gestão de pedidos no admin
2. **Esperado:** Lista de pedidos da loja com detalhes.

### CT-09: Rate limit
1. Fazer 11 pedidos em 1 minuto
2. **Esperado:** Bloqueado após 10 (429).

### CT-10: Pedido com cupom incrementa usedCount
1. Criar pedido com cupom válido
2. **Esperado:** `usedCount` do cupom incrementado em 1.

### CT-11: orderNumber duplicado
1. Tentar criar pedido com orderNumber já existente na loja
2. **Esperado:** Falha silenciosa (unique constraint).

## Função de Validação (validateOrderArithmetic)

Localização: `domain/order/services/order.service.ts`

Verifica:
- `lineTotal = unitPrice × quantity` (para cada item)
- `subtotal = sum(lineTotals)`
- `total = subtotal - discount`
- `unitPrice` bate com preço do produto no banco (com promoções/cupons)
- Tolerância: 1 centavo

## Critérios de Aceite

- [ ] Pedido criado com validação completa
- [ ] Preços manipulados são rejeitados (400)
- [ ] Promoções e cupons considerados na validação
- [ ] usedCount do cupom incrementado
- [ ] Gestão de pedidos no admin funciona
- [ ] Rate limit no endpoint de criação
