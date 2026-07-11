# 13 — Segurança

[← Voltar ao início](00-inicio.md)

## Camadas de defesa

### Autenticação e autorização

- JWT com expiração de **1 dia**; `JWT_SECRET` obrigatório em produção (API não sobe sem ele).
- Tokens sem `storeId` ou `role` são rejeitados por `app.authenticate`.
- Roles server-side: `requireOwner`, `requireSuperAdmin`, `requireVerifiedEmail` (ver [Autenticação](04-autenticacao-e-usuarios.md)).
- Verificação de e-mail obrigatória após 7 dias (aplicada dentro de `app.authenticate`).

### Rate limiting (`@fastify/rate-limit`)

| Escopo | Limite |
|--------|--------|
| Global | 300 req/min |
| Login | 10/min por IP **+ 10 tentativas / 15 min por e-mail** (anti brute-force distribuído) |
| Register | 5/min |
| POSTs públicos (orders/customers) | 10/min |
| Analytics público | 120/min |
| Lookup de cupom por código | 20/min |
| Forgot/reset password | 3/min e 5/min |
| WhatsApp test/status/sync | 5, 30 e 2/min |

- `trustProxy: true` para o rate limit enxergar o IP real atrás de Vercel/nginx.
- Contadores em **memória de processo** por padrão; com `REDIS_URL`, vão para Redis compartilhado (`shared/cache/rate-limit-redis.ts`, lazy-load do ioredis, `skipOnError: true` — queda do Redis nunca bloqueia requests). **Necessário em serverless** para os limites valerem entre instâncias.

### Validação de entrada

- Validadores Zod reutilizáveis em `shared/validation/schemas.ts`: `idSchema`, `dateSchema`, `timeSchema`, `hexColorSchema`, `httpUrlSchema`, `imageUrlSchema`, `phoneSchema`, `shortText`. **Todo schema novo deve usá-los** — IDs, datas, cores e URLs são conferidos antes de chegar ao Prisma.
- `imageUrlSchema` bloqueia `javascript:` e data URIs não-imagem; cap de ~3 MB (ver [Imagens](10-imagens-r2.md)).
- Mensagens de erro em português claro (`"Nome é obrigatório"`).

### Proteção de dados

- **Tenant guard** contra vazamento entre lojas (ver [Multi-tenancy](03-multi-tenancy.md)).
- Erros 5xx **sempre mascarados**: `"Erro interno do servidor"` — nada de stack trace ou detalhe interno.
- `forgot-password` sempre responde 200 (não revela se o e-mail existe).
- Lista de cupons exige JWT; o público só valida um código por vez (ver [Precificação](06-precificacao.md)).
- Rotas públicas de promoções/destaques só retornam `active: true`.
- Perfil público da loja usa **allowlist** de campos (`CAMPOS_PUBLICOS`).
- `metaAccessToken` é **write-only** (nunca retorna pela API).

### Integridade de pedidos

Aritmética e preços validados **no servidor**, com promoções/cupons e tolerância de 1 centavo — pedidos manipulados retornam 400 (ver [Pedidos](07-pedidos.md)).

### Webhooks

`POST /api/webhooks/stripe` validado pela assinatura do Stripe (`STRIPE_WEBHOOK_SECRET`).

**Fail-closed em produção:** se `STRIPE_SECRET_KEY` está definida sem `STRIPE_WEBHOOK_SECRET`, o servidor **recusa o boot** (o `stripePlugin` lança). Defesa em profundidade: a própria rota responde 500 se receber um evento sem verificação de assinatura configurada em produção — nunca processa evento não assinado. Sem isso, um atacante poderia forjar um `checkout.session.completed` e ativar assinatura de graça.

### Observabilidade

Logins falhos logados com `app.log.warn` (e-mail + IP).

## Riscos aceitos (documentados — ler antes de mudar)

| Risco | Mitigação atual | Alternativa conhecida |
|-------|-----------------|----------------------|
| JWT no `localStorage` (XSS pode roubar) | — | cookie httpOnly |
| Sem revogação server-side de token | expiração de 1 dia | blocklist/sessões server-side |
| UI esconde recursos lendo role do localStorage | API rejeita de qualquer forma | — |
| `orderNumber` gerado no cliente | unique composto por loja; colisão falha silenciosamente (fire-and-forget) | geração server-side |
| Rate limit sem Redis é por instância serverless | `REDIS_URL` resolve p/ login (IP + e-mail) | — |
| `metaAccessToken` em plaintext no banco | write-only + OWNER-only | AES-GCM com chave de env |
| Sync WhatsApp envia preço base (sem promoções/variantes) | decisão de design: vitrine; checkout no site | — |
| `/batch` da Meta é assíncrono — contadores best-effort | erros de `validation_status` são tratados | — |

## Próxima página

→ [14 — Deploy e Ambientes](14-deploy-e-ambientes.md)
