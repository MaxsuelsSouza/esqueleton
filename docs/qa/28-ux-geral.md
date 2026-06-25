# QA — UX Geral

**Commits relacionados:** `f2ef3f2`, `852dd82`, `edbcbab`, `188734d`, `9285a81`
**Data:** 2026-06-14 a 2026-06-18

## Descrição

Melhorias de UX distribuídas por todo o sistema: barra de loading global, cache de logo, sugestões de produtos, autocomplete na busca, clicabilidade de itens na sacola.

## Casos de Teste

### CT-01: Barra de loading global
1. Navegar entre páginas
2. **Esperado:** Barra de progresso no topo durante transições de rota (feature `f2ef3f2`).

### CT-02: Cache do logo no localStorage
1. Acessar loja
2. Recarregar página
3. **Esperado:** Logo aparece instantaneamente (sem flash de "Minha Loja"). Cache via localStorage (fix `852dd82`).

### CT-03: Autocomplete na busca
1. Digitar parcialmente o nome de um produto
2. **Esperado:** Dropdown de sugestões aparece com produtos matching (feature `edbcbab`).

### CT-04: Sugestões de produtos
1. Acessar detalhe de um produto
2. **Esperado:** Seção "Você também pode gostar" ou similar com produtos relacionados.

### CT-05: "Comprar agora"
1. Clicar em "Comprar agora" no detalhe do produto
2. **Esperado:** Adiciona à sacola e redireciona para sacola (feature `edbcbab`).

### CT-06: Imagem e nome clicáveis na sacola
1. Na sacola, clicar na imagem ou nome de um produto
2. **Esperado:** Navega para o detalhe do produto (feature `188734d`).

### CT-07: Layout responsivo
1. Acessar catálogo em mobile (320px, 375px)
2. **Esperado:** Layout adaptado. Touch funciona. Sem overflow horizontal.

### CT-08: Acessibilidade básica
1. Navegar por teclado (Tab, Enter, Escape)
2. **Esperado:** Elementos interativos são acessíveis por teclado.

## Critérios de Aceite

- [ ] Loading global visível durante transições
- [ ] Logo não pisca ao recarregar
- [ ] Autocomplete funciona na busca
- [ ] Sugestões exibidas no detalhe do produto
- [ ] Itens da sacola são clicáveis
- [ ] Layout responsivo em todos os breakpoints
