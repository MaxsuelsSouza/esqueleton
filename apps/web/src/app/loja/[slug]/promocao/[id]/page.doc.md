# Promoção — /loja/[slug]/promocao/[id]

Página pública que exibe todos os produtos de uma promoção específica.
Acessada pelo menu lateral do header mobile (botão de três traços), que lista
as promoções ativas da loja.

| Arquivo | Responsabilidade |
|---------|------------------|
| `page.hooks.ts` | Busca as promoções públicas da loja, localiza a promoção pelo `id` da URL e carrega os produtos dela (`getPublicProductsByIds` quando a promoção tem lista de produtos; catálogo inteiro quando a lista é vazia). Aplica `applyPromotionToProduct` em cada produto para preço com desconto, badge e metadados. |
| `page.tsx` | View pura: link de voltar, cabeçalho da promoção (nome, descrição e cor), grade de `ProductCard`, esqueleto de carregamento e estados de erro/vazio. |

## Fluxo

1. O menu lateral (`MobileMenuDrawer`) lista as promoções ativas e navega para esta rota.
2. O hook busca `GET /api/lojas/:slug/promotions` e encontra a promoção pelo `id`.
   Se não existir (desativada ou expirada), exibe "Promoção não encontrada".
3. Os produtos vêm por IDs (`?ids=`) ou paginados (`pageSize=500`) quando a
   promoção vale para o catálogo inteiro.
4. Cada produto passa por `applyPromotionToProduct` — mesmo cálculo de preço
   usado no catálogo, garantindo consistência visual.
