# QA — Rate Limiting

**Commits relacionados:** `3c342bc`
**Data:** 2026-06-12

## Descrição

Proteção contra abuso via `@fastify/rate-limit`. Rate limit global de 300 req/min com limites mais rígidos em endpoints sensíveis. Login tem limite adicional por e-mail para bloquear brute force distribuído.

## Limites Configurados

| Endpoint | Limite | Janela |
|----------|--------|--------|
| Global | 300 req | 1 min |
| `POST /api/auth/login` | 10 req | 1 min |
| `POST /api/auth/login` (por e-mail) | 10 req | 15 min |
| `POST /api/auth/register` | 5 req | 1 min |
| `POST /api/auth/forgot-password` | 3 req | 1 min |
| `POST /api/auth/reset-password` | 5 req | 1 min |
| `POST /api/auth/verify-email` | 10 req | 1 min |
| `POST /api/auth/resend-verification` | 2 req | 1 min |
| `POST /api/lojas/:slug/orders` | 10 req | 1 min |
| `POST /api/lojas/:slug/customers` | 10 req | 1 min |
| `GET /api/lojas/:slug/analytics` | 120 req | 1 min |
| `GET /api/lojas/:slug/coupons/codigo/:code` | 20 req | 1 min |

## Casos de Teste

### CT-01: Rate limit global
1. Enviar 301 requisições em menos de 1 minuto
2. **Esperado:** 429 Too Many Requests na 301ª requisição.

### CT-02: Rate limit de login por IP
1. Fazer 11 tentativas de login em 1 minuto
2. **Esperado:** Bloqueado após 10 tentativas.

### CT-03: Rate limit de login por e-mail
1. Fazer 11 tentativas de login com o mesmo e-mail em 15 minutos (IPs diferentes simulados)
2. **Esperado:** Bloqueado após 10 tentativas para aquele e-mail.

### CT-04: Header Retry-After
1. Ser bloqueado por rate limit
2. **Esperado:** Response inclui header `Retry-After` com segundos restantes.

### CT-05: Redis como backend (REDIS_URL)
1. Configurar `REDIS_URL` no `.env`
2. Verificar que contadores são compartilhados entre instâncias
3. **Esperado:** Rate limit funciona cross-instance.

### CT-06: Fallback sem Redis
1. Remover `REDIS_URL`
2. **Esperado:** Rate limit funciona em memória (por instância). Sem erro.

### CT-07: Redis com skipOnError
1. Derrubar o Redis durante operação
2. **Esperado:** Rate limiting degrada gracefully — nunca bloqueia requests por falha no Redis.

## Observações

- `trustProxy: true` garante que o IP real é lido atrás de Vercel/nginx.
- Sem `REDIS_URL`, o rate limit é per-instance (cada instância serverless tem seu próprio contador).

## Critérios de Aceite

- [ ] Todos os endpoints respeitam seus limites configurados
- [ ] Login tem proteção por IP e por e-mail
- [ ] 429 retornado com header Retry-After
- [ ] Funciona com e sem Redis
- [ ] Queda do Redis não bloqueia requisições
