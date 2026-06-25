# QA — Catálogo Público

**Commits relacionados:** `ebd8824`, `edbcbab`, `5309619`
**Data:** 2026-06-09, 2026-06-18, 2026-06-21

## Descrição

Catálogo público da loja em `/loja/{slug}`. Exibe produtos com filtros por categoria, faixa de preço, busca textual e ordenação. Suporta modos grade e lista. Aplica promoções e cupons sobre os preços.

## Pré-condições

- Loja com produtos cadastrados
- Pelo menos uma promoção ativa (para testar transformações de preço)

## Casos de Teste

### CT-01: Listar produtos
1. Acessar `/loja/<slug>`
2. **Esperado:** Produtos da loja exibidos em grade. Apenas produtos com `isAvailable: true`.

### CT-02: Alternar exibição (grade/lista)
1. Clicar no toggle de exibição
2. **Esperado:** Alterna entre `DisplayMode: 'grid'` e `'list'`.

### CT-03: Busca textual
1. Digitar nome de produto no campo de busca
2. **Esperado:** Produtos filtrados em tempo real. Autocomplete com sugestões (feature `edbcbab`).

### CT-04: Filtro por categoria
1. Selecionar uma categoria no filtro lateral
2. **Esperado:** Apenas produtos da categoria (e subcategorias) exibidos.

### CT-05: Filtro por faixa de preço
1. Definir preço mínimo e máximo
2. **Esperado:** Apenas produtos na faixa exibidos. Usa preço após promoção.

### CT-06: Ordenação
1. Ordenar por: mais recente, menor preço, maior preço, nome A-Z
2. **Esperado:** Lista reordenada corretamente.

### CT-07: Promoções aplicadas automaticamente
1. Produto com promoção ativa
2. **Esperado:** Preço original riscado, novo preço exibido, tag de desconto (%).

### CT-08: Cupom aplicado no catálogo
1. Digitar código de cupom no campo acima do catálogo
2. **Esperado:** Cupom validado no servidor (`GET /api/lojas/:slug/coupons/codigo/:code`). Desconto aplicado nos produtos elegíveis.

### CT-09: Cupom inválido/expirado
1. Digitar código inválido
2. **Esperado:** Mensagem de erro via `couponErrorMessage`.

### CT-10: Cupom com productIds
1. Cupom que afeta apenas produtos específicos
2. **Esperado:** Desconto aplicado apenas nesses produtos.

### CT-11: Detalhe do produto
1. Clicar em um produto
2. **Esperado:** Página `/loja/<slug>/produto/<id>` com detalhes completos, variantes, características, galeria de fotos.

### CT-12: Sugestões de produtos
1. Na página de detalhe do produto
2. **Esperado:** Seção de sugestões/produtos relacionados (feature `edbcbab`).

### CT-13: "Comprar agora"
1. Clicar em "Comprar agora" no detalhe
2. **Esperado:** Produto adicionado à sacola e redireciona para sacola.

## Ordem de Transformações

1. `applyPromotionsToProducts` — modifica preços e adiciona badge
2. `applyCouponToProduct` — sobrescreve preço dos elegíveis
3. Filtros/ordenação — aplicados sobre o resultado final

## Critérios de Aceite

- [ ] Catálogo lista apenas produtos da loja e disponíveis
- [ ] Filtros (categoria, preço, busca) funcionam
- [ ] Ordenação funciona
- [ ] Promoções aplicam desconto visual
- [ ] Cupom validado no servidor e aplicado
- [ ] Detalhe do produto exibe todas as informações
- [ ] Autocomplete na busca funciona
