# Detalhe do Produto

Pagina publica que exibe todas as informacoes de um produto: galeria de fotos, preco com promocao, variantes, caracteristicas, descricao e acoes (sacola, favorito, copiar link).

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza o layout em duas colunas (galeria + informacoes), botoes de acao, seletor de variantes e estados de carregamento/nao encontrado. Inclui sub-componentes `ProductDetailSkeleton` e `ProductNotFound`. |
| `page.hooks.ts` | Busca produto e promocoes via API, aplica promocao ativa, gerencia galeria de fotos, selecao de variantes (com calculo de preco proporcional), adicao a sacola, favoritos, copia de link e registro de analytics (visualizacao unica por dia). |

## Fluxo de dados

`useParams()` extrai `slug` e `id` → `catalogService.getPublicProduct(slug, id)` + `promotionsService.listPublicPromotions(slug)` em paralelo → `getActivePromotionForProduct` encontra promocao ativa → `applyPromotionToProduct` aplica desconto → variantes ativas sao extraidas em `optionGroups` → selecao do usuario encontra `selectedVariant` via `findVariant` → preco final (`displayPrice`) e calculado proporcionalmente → `analyticsService.recordEvent` registra visualizacao (uma vez por dia por navegador).

## Estados gerenciados

| Estado | Tipo | Descricao |
|--------|------|-----------|
| `product` | `Product \| null` | Produto carregado (com preco ja alterado pela promocao, se houver) |
| `rawPrice` | `number \| null` | Preco original do produto antes da promocao |
| `promoDiscountPercent` | `number \| undefined` | Percentual de desconto da promocao ativa |
| `isLoading` | `boolean` | Carregamento do produto |
| `copied` | `boolean` | Indica que o link foi copiado (feedback visual de 2s) |
| `added` | `boolean` | Indica que o produto foi adicionado a sacola (feedback de 1.5s) |
| `currentImageIndex` | `number` | Indice da imagem visivel na galeria |
| `selectedOptions` | `Record<string, string>` | Opcoes de variante selecionadas pelo cliente (ex: `{ Cor: "Preto" }`) |

## Acoes do usuario

| Acao | Handler | O que faz |
|------|---------|-----------|
| Selecionar opcao de variante | `handleSelectOption` | Atualiza `selectedOptions`, recalcula preco e volta galeria para indice 0 |
| Clicar "Adicionar a sacola" | `handleAddToBag` | Adiciona produto (com variante se selecionada) ao contexto de sacola |
| Clicar "Favoritar" | `toggleFavorite` | Adiciona ou remove o produto dos favoritos (contexto) |
| Clicar "Copiar link" | `handleCopyLink` | Copia a URL da pagina para o clipboard e registra evento de analytics |
| Navegar na galeria (setas/miniaturas) | `setCurrentImageIndex` | Muda a imagem visivel |
| Clicar "Voltar ao catalogo" | `router.back()` | Volta para a pagina anterior |

## Modulos utilizados

- `@/shared/hooks/useStoreSlug` — extrai o slug da URL
- `@/modules/catalog/services/catalog.service` — `getPublicProduct`
- `@/modules/catalog/components/ProductPrice` — componente de exibicao de preco com desconto
- `@/modules/catalog/mocks/products` — dados mock (flag `USE_MOCK_DATA`)
- `@/modules/promotions/services/promotions.service` — `listPublicPromotions`
- `@/modules/promotions/utils/promotions` — `getActivePromotionForProduct`, `applyPromotionToProduct`
- `@/modules/promotions/mocks/promotions` — dados mock de promocoes
- `@/modules/bag/contexts/bag-context` — `useBag` para adicionar itens
- `@/modules/favorites/contexts/favorites-context` — `useFavorites` para favoritar/desfavoritar
- `@/modules/analytics/services/analytics.service` — `recordEvent` para PRODUCT_VIEW e LINK_COPY

## Observacoes

- A flag `USE_MOCK_DATA` esta definida como `false` (usa API real).
- A visualizacao e registrada no maximo uma vez por dia por produto por navegador, usando `localStorage` com chave `esqueleton_produtos_vistos`.
- Quando ha promocao, o desconto e aplicado proporcionalmente as variantes: `displayPrice = variant.price * (product.price / rawPrice)`.
- A galeria prioriza a imagem da variante selecionada, colocando-a como primeira.
- O `useEffect` usa flag `cancelled` para evitar duplo registro de analytics no StrictMode do React.
