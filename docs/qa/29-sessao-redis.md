# QA — Sessão no Redis (Sacola e Favoritos)

**Commits relacionados:** `6835de3`
**Data:** 2026-06-13

## Descrição

Sacola e favoritos podem ser armazenados no Redis (Upstash) em vez do localStorage. A sessão é identificada por um cookie ou header. Com `REDIS_URL`, dados persistem entre dispositivos/abas. Sem Redis, funciona em memória/localStorage.

## Pré-condições

- `REDIS_URL` configurado no `.env` da API (ex: Upstash)

## Casos de Teste

### CT-01: Sacola persiste com Redis
1. Adicionar itens à sacola
2. Fechar navegador
3. Reabrir
4. **Esperado:** Itens da sacola mantidos (sessão Redis).

### CT-02: Favoritos persistem com Redis
1. Favoritar produtos
2. Fechar e reabrir
3. **Esperado:** Favoritos mantidos.

### CT-03: Fallback sem Redis
1. Remover `REDIS_URL`
2. Adicionar itens à sacola
3. **Esperado:** Funciona via memória/localStorage. Sem erros.

### CT-04: Sessão isolada por sessão/cookie
1. Abrir em dois navegadores diferentes (sessões distintas)
2. **Esperado:** Cada sessão tem sua própria sacola e favoritos.

### CT-05: Redis indisponível
1. Derrubar Redis durante uso
2. **Esperado:** Degradação graceful — não quebra a aplicação.

## Arquitetura

| Componente | Arquivo |
|------------|---------|
| Interface SessionStore | `domain/session/store/session-store.ts` |
| Redis implementation | `domain/session/store/session-store.ts` |
| Memory implementation | `domain/session/store/session-store.ts` |
| Plugin de sessão | `http/plugins/session.plugin.ts` |
| Rotas de sessão | `http/routes/session/session.routes.ts` |

## Critérios de Aceite

- [ ] Sacola persiste com Redis
- [ ] Favoritos persistem com Redis
- [ ] Fallback para localStorage funciona
- [ ] Sessões isoladas entre usuários
- [ ] Degradação graceful sem Redis
