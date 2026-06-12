// Conexão com o Redis usada pelo limite de requisições (rate limit).
//
// Por padrão os contadores de requisições ficam na memória do processo — o que
// funciona bem rodando em um servidor só (dev local ou VPS). Já em produção
// serverless (Vercel), cada instância tem a própria memória: o limite ficaria
// multiplicado pelo número de instâncias e zeraria a cada cold start.
// Definindo REDIS_URL, os contadores passam a viver em um Redis compartilhado
// entre todas as instâncias — o limite volta a valer de verdade.
//
// Serviços como o Upstash oferecem Redis gerenciado (com plano gratuito) feito
// para esse cenário. Exemplo de URL: rediss://default:senha@xxx.upstash.io:6379

// Formato mínimo do cliente Redis que usamos aqui — evita depender dos tipos
// do pacote ioredis, que só precisa estar instalado quando REDIS_URL é definido
export type RateLimitRedis = {
  quit: () => Promise<unknown>
}

export function createRateLimitRedis(redisUrl: string | undefined): RateLimitRedis | null {
  if (!redisUrl) return null

  // Carrega o ioredis apenas quando o Redis está configurado — sem REDIS_URL o
  // projeto roda normalmente mesmo sem o pacote instalado
  const Redis = require('ioredis') as new (url: string, options: object) => RateLimitRedis

  return new Redis(redisUrl, {
    // Se o Redis estiver lento ou fora do ar, é melhor desistir rápido e deixar
    // a requisição passar (veja skipOnError no app.ts) do que travar a API
    connectTimeout: 500,
    maxRetriesPerRequest: 1,
  })
}
