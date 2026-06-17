# shared/cache/ — Redis para rate limiting

Conexão Redis opcional para compartilhar contadores de rate limiting entre instâncias serverless.

## Arquivos

### `rate-limit-redis.ts`

**Exporta:** `createRateLimitRedis(redisUrl: string | undefined): RateLimitRedis | null`

**Sem `REDIS_URL`:** retorna `null` — rate limiting usa memória do processo (ok em dev e VPS única).
**Com `REDIS_URL`:** cria cliente ioredis com conexão rápida e sem retries excessivos.

```typescript
// Em app.ts
const rateLimitRedis = createRateLimitRedis(process.env.REDIS_URL)

app.register(rateLimit, {
  max: 300,
  timeWindow: '1 minute',
  ...(rateLimitRedis ? { redis: rateLimitRedis, skipOnError: true } : {}),
})
```

**Configuração do cliente Redis:**
- `connectTimeout: 500` — falha rápido se Redis não responder
- `maxRetriesPerRequest: 1` — não fica tentando
- `skipOnError: true` (definido em app.ts) — se Redis cair, a requisição passa sem ser contada

**Lazy loading:** o `ioredis` é importado via `require()` em runtime, não no topo do arquivo — evita carregar a lib quando não há Redis configurado.

**Cleanup:** em `app.ts`, um hook `onClose` chama `rateLimitRedis.quit()` ao desligar o servidor.

## Por que é necessário

Na Vercel (serverless), cada instância tem sua própria memória. Sem Redis, um atacante poderia distribuir 300 req/min por instância. Com Redis (ex: Upstash), todos os contadores são compartilhados — o limite é global.

## Variáveis de ambiente

- `REDIS_URL` — URL de conexão Redis (ex: `redis://default:senha@host:6379`, ou URL do Upstash)
