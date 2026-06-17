# routes/session/ — Sacola e favoritos

Persistência de sacola e favoritos dos visitantes via `X-Session-Token`.

## Arquivos

### `session.routes.ts`

**Exporta:** `sessionPublicRoutes` (prefixo `/api/lojas/:slug/session`, somente público)

| Rota | O que faz |
|------|-----------|
| `GET /cart` | Retorna itens da sacola |
| `PUT /cart` | Salva sacola (substitui conteúdo) |
| `DELETE /cart` | Limpa sacola |
| `GET /favorites` | Retorna IDs dos favoritos |
| `PUT /favorites` | Salva favoritos (substitui lista) |
| `DELETE /favorites` | Limpa favoritos |

**Identificação do visitante:** header `X-Session-Token` (UUID gerado pelo frontend). Sem token → 400.

**Armazenamento:** usa `app.sessionStore` (Redis em produção, memória em dev). Dados isolados por `storeId + sessionToken`.

**Não requer autenticação** — é para visitantes anônimos do catálogo público.

**Sacola armazena apenas IDs e quantidades** — dados do produto (nome, preço, imagem) são buscados frescos do banco ao carregar.
