# domain/catalog/ — Produtos e categorias

Lógica de negócio do catálogo: listagem paginada de produtos e exclusão recursiva de categorias.

## Arquivos

### `services/product.service.ts`

| Export | Tipo | O que faz |
|--------|------|-----------|
| `PRODUCT_INCLUDE` | constante | Inclui `categories` e `variants` nas consultas Prisma |
| `toProductResponse(product)` | função | Transforma formato Prisma → formato da API (categoryIds, images, characteristics, variants opcionais) |
| `listarProdutos(prisma, storeId, query)` | função async | Listagem paginada com filtros |
| `ListQuery` | tipo | Parâmetros aceitos na query string |

**`listarProdutos` suporta:**
- **Paginação:** `page` (default 1), `pageSize` (default 20, máximo 500)
- **Busca por texto:** `search` em nome, marca e descrição (case-insensitive, limitado a 200 chars)
- **Filtro por categorias:** `categoryIds` separados por vírgula
- **Filtro por preço:** `priceMin`, `priceMax`
- **Ordenação:** `sortBy` = `price-asc`, `price-desc`, `name` ou padrão (mais recentes)
- **Busca por IDs:** `ids` separados por vírgula (máximo 100, ignora paginação — usado pela seção em destaque)

**Retorno:**
```typescript
{ data: Product[], total: number, page: number, pageSize: number, totalPages: number }
```

**`toProductResponse`** omite campos opcionais vazios (images, characteristics, variants) — só retorna quando preenchidos.

### `services/category.service.ts`

| Export | O que faz |
|--------|-----------|
| `collectDescendantIds(prisma, rootId, storeId)` | Coleta todos os IDs descendentes de uma categoria usando BFS |

Necessário para excluir uma categoria e todas as suas filhas. A busca em largura (BFS) desce nível por nível até não encontrar mais filhos.

```typescript
// Uso na rota DELETE /api/categories/:id
const ids = await collectDescendantIds(app.prisma, id, storeId)
await app.prisma.productCategory.deleteMany({ where: { categoryId: { in: ids }, storeId } })
await app.prisma.category.deleteMany({ where: { id: { in: ids }, storeId } })
```
