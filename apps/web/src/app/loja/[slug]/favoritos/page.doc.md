# Favoritos

Pagina publica que exibe os produtos salvos como favoritos pelo cliente, com promocoes aplicadas.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza a grade de produtos favoritos com esqueleto de carregamento e estado vazio. Usa `ProductCard` para exibir cada produto. |
| `page.hooks.ts` | Busca os dados completos dos produtos favoritos e as promocoes ativas, aplica descontos e retorna a lista pronta para renderizacao. |

## Fluxo de dados

`useFavorites()` fornece `favoriteIds` (IDs dos produtos favoritados, persistidos no servidor) → `catalogService.getPublicProductsByIds(slug, favoriteIds)` + `promotionsService.listPublicPromotions(slug)` buscam dados e promocoes em paralelo → `applyPromotionsToProducts` aplica descontos → `promotedProducts` chega a view pronto para renderizar.

## Estados gerenciados

| Estado | Tipo | Descricao |
|--------|------|-----------|
| `products` | `Product[]` | Produtos favoritos carregados da API |
| `promotions` | `Promotion[]` | Promocoes ativas da loja |
| `isLoading` | `boolean` | Carregamento dos dados |

Dados derivados (useMemo):
| Estado | Tipo | Descricao |
|--------|------|-----------|
| `promotedProducts` | `PromotedProduct[]` | Produtos com promocoes aplicadas (preco, badge, desconto) |

## Acoes do usuario

| Acao | Handler | O que faz |
|------|---------|-----------|
| Clicar "Voltar" | `router.back()` | Volta para a pagina anterior |
| Clicar "Ver catalogo" (estado vazio) | `router.push(/loja/${slug})` | Navega para o catalogo da loja |
| Interagir com ProductCard | — | O ProductCard tem suas proprias acoes (favoritar, adicionar a sacola, ver detalhe) |

## Modulos utilizados

- `@/shared/hooks/useStoreSlug` — extrai o slug da URL
- `@/modules/favorites/contexts/favorites-context` — `useFavorites` (lista de IDs favoritos)
- `@/modules/catalog/services/catalog.service` — `getPublicProductsByIds`
- `@/modules/catalog/components/ProductCard` — cartao de produto com badge de promocao
- `@/modules/promotions/services/promotions.service` — `listPublicPromotions`
- `@/modules/promotions/utils/promotions` — `applyPromotionsToProducts`

## Observacoes

- O `useEffect` depende de `favoriteIds.length` (nao da referencia do array) para evitar re-fetches desnecessarios.
- Se nao houver favoritos, a API nao e chamada e a lista e zerada imediatamente.
- Promocoes que falham ao carregar sao tratadas silenciosamente (array vazio), permitindo exibir os produtos mesmo sem desconto.
- A grade usa layout fixo de 2 a 4 colunas conforme o tamanho da tela, sempre em modo `grid`.
