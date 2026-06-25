# QA — Validação de Preço no Servidor

**Commits relacionados:** `bba09d2`, `08ada0c`
**Data:** 2026-06-23

## Descrição

O servidor valida o `unitPrice` de cada item do pedido contra o preço real do produto no banco de dados, levando em conta promoções ativas e cupons aplicados. Tolerância de 1 centavo para arredondamento.

## Casos de Teste

### CT-01: Preço correto (sem promoção/cupom)
1. Criar pedido com unitPrice = preço do produto no banco
2. **Esperado:** Pedido aceito (200).

### CT-02: Preço manipulado (menor que o real)
1. Alterar unitPrice via DevTools para valor menor
2. Enviar pedido
3. **Esperado:** 400 — preço não corresponde ao produto.

### CT-03: Preço com promoção ativa
1. Produto R$ 100 com promoção de 30% → unitPrice = R$ 70
2. **Esperado:** Aceito — servidor calcula preço com promoção.

### CT-04: Preço com cupom
1. Produto R$ 100 com cupom de 15% → unitPrice = R$ 85
2. **Esperado:** Aceito — servidor calcula preço com cupom.

### CT-05: Preço com promoção + cupom
1. Produto R$ 100, promoção 20% (= R$ 80), cupom 10% (= R$ 72)
2. **Esperado:** Servidor valida a combinação correta.

### CT-06: Tolerância de 1 centavo
1. unitPrice = R$ 69.99 quando o cálculo dá R$ 70.00
2. **Esperado:** Aceito (diferença < 1 centavo).

### CT-07: Tolerância excedida
1. unitPrice = R$ 69.00 quando o cálculo dá R$ 70.00
2. **Esperado:** 400 — diferença > 1 centavo.

### CT-08: Promoção expirada entre adição e checkout
1. Promoção expira enquanto o produto está na sacola
2. Tentar criar pedido com preço promocional
3. **Esperado:** 400 — promoção não está mais ativa, preço real é o cheio.

## Critérios de Aceite

- [ ] Preços manipulados são rejeitados
- [ ] Promoções ativas consideradas na validação
- [ ] Cupons considerados na validação
- [ ] Tolerância de 1 centavo funciona
- [ ] Promoção expirada invalida preço promocional
