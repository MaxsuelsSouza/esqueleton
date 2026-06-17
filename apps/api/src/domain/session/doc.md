# domain/session/ — Sacola e favoritos

Armazenamento persistente de sacola e favoritos dos visitantes.

## Arquivos

### `store/session-store.ts`

Define a interface `SessionStore` e duas implementações: Redis e memória.

**Exports:**
- `SessionStore` — interface usada pelas rotas
- `CartRedisItem` — tipo do item da sacola (`{ productId, quantity, promotionId?, promotionName? }`)
- `createSessionStore(redisUrl)` — fábrica: retorna Redis ou memória conforme ambiente

**Interface `SessionStore`:**

| Método | O que faz |
|--------|-----------|
| `getCart(storeId, sessionToken)` | Retorna itens da sacola |
| `setCart(storeId, sessionToken, items)` | Salva sacola (vazia = deleta) |
| `deleteCart(storeId, sessionToken)` | Remove sacola |
| `getFavorites(storeId, sessionToken)` | Retorna IDs dos favoritos |
| `setFavorites(storeId, sessionToken, ids)` | Salva favoritos (vazio = deleta) |
| `deleteFavorites(storeId, sessionToken)` | Remove favoritos |
| `close()` | Fecha conexão (Redis) ou limpa Map (memória) |

**Chaves no Redis:** `cart:{storeId}:{sessionToken}`, `fav:{storeId}:{sessionToken}`

**TTL:** 30 dias — o visitante pode fechar o navegador e voltar que a sacola ainda estará lá.

### `RedisSessionStore` (produção)

Usa `ioredis` com `EX` (expiração automática). Dados armazenados como JSON stringificado.

### `InMemorySessionStore` (dev)

Usa `Map<string, { value, expiresAt }>` com expiração preguiçosa (verifica no `get`). Dados somem ao reiniciar o servidor.

```typescript
// Criado pelo session.plugin.ts
const store = createSessionStore(process.env.REDIS_URL)
app.decorate('sessionStore', store)
```

## Fluxo

```
Visitante adiciona produto à sacola
  → frontend envia X-Session-Token no header
  → PUT /api/lojas/:slug/session/cart { items }
  → app.sessionStore.setCart(storeId, token, items)
  → salva no Redis (ou memória)

Visitante abre a sacola
  → GET /api/lojas/:slug/session/cart (com X-Session-Token)
  → app.sessionStore.getCart(storeId, token)
  → retorna itens (IDs + quantidade)
  → frontend busca dados frescos dos produtos no banco
```
