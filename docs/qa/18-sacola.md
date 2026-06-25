# QA — Sacola de Compras

**Commits relacionados:** `55d2169`, `5e823db`, `188734d`, `6835de3`
**Data:** 2026-06-13 a 2026-06-17

## Descrição

Sacola de compras com adição/remoção de produtos, cálculo de totais, aplicação de promoções e envio do pedido via WhatsApp. Sacola pode ser armazenada no Redis (Upstash) ou localStorage.

## Casos de Teste

### CT-01: Adicionar produto à sacola
1. No catálogo, clicar em "Adicionar à sacola"
2. **Esperado:** Produto adicionado. Contador da sacola atualizado.

### CT-02: Alterar quantidade
1. Na sacola, alterar quantidade de um produto
2. **Esperado:** Subtotal recalculado. Total atualizado.

### CT-03: Remover produto
1. Clicar em remover
2. **Esperado:** Produto removido. Totais recalculados.

### CT-04: Preço promocional na sacola
1. Produto com promoção ativa
2. **Esperado:** Sacola exibe preço promocional (não o original). Preço original riscado (fix `55d2169`).

### CT-05: Resumo de promoções
1. Sacola com produtos promocionais
2. **Esperado:** Resumo mostra economia total (feature `5e823db`).

### CT-06: Imagem e nome clicáveis
1. Na sacola, clicar na imagem ou nome do produto
2. **Esperado:** Navega para a página de detalhe do produto (feature `188734d`).

### CT-07: Enviar pedido via WhatsApp
1. Clicar em "Enviar pedido"
2. **Esperado:** Abre WhatsApp com mensagem formatada contendo itens, quantidades, preços e total. Sacola limpa após envio (fix `55d2169`).

### CT-08: Sacola vazia
1. Acessar sacola sem itens
2. **Esperado:** Mensagem "Sacola vazia" ou similar.

### CT-09: Borda condicional
1. Produto na sacola com/sem imagem
2. **Esperado:** Borda visual condicional correta (fix `55d2169`).

### CT-10: Persistência no Redis
1. Com `REDIS_URL` configurado
2. Adicionar itens, fechar navegador, reabrir
3. **Esperado:** Itens da sacola persistem via sessão Redis.

### CT-11: Fallback para localStorage
1. Sem `REDIS_URL`
2. **Esperado:** Sacola funciona via localStorage.

## Critérios de Aceite

- [ ] Adicionar/remover/alterar quantidade funciona
- [ ] Preço promocional exibido corretamente
- [ ] Envio via WhatsApp funciona e limpa a sacola
- [ ] Imagem e nome são clicáveis
- [ ] Persistência (Redis ou localStorage) funciona
