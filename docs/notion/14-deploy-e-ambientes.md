# 14 — Deploy e Ambientes

[← Voltar ao início](00-inicio.md)

## Rodando localmente

```bash
pnpm install                               # dependências
docker-compose up -d                       # Postgres local
pnpm --filter @esqueleton/api db:migrate   # migrações
pnpm dev                                   # API (:3001) + Web (:3000)
```

Copie os `.env.example` antes: `apps/api/.env` e `apps/web/.env.local`.

## Variáveis de ambiente

### API (`apps/api/.env`)

| Variável | Obrigatória | O quê |
|----------|:-----------:|-------|
| `DATABASE_URL` | ✅ | conexão Postgres |
| `JWT_SECRET` | ✅ em prod | segredo do JWT — API não sobe sem ele em produção |
| `PORT` | — | porta (padrão 3001) |
| `CORS_ORIGIN` | ✅ em prod | origem permitida |
| `RESEND_API_KEY`, `FROM_EMAIL`, `FRONTEND_URL` | opcional | e-mails (sem key → apenas logados) |
| `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` | opcional | billing (sem token → no-op) |
| `REDIS_URL` | recomendada em serverless | rate limit compartilhado + session store |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | ✅ em prod | imagens ([R2](10-imagens-r2.md)) |

### Web (`apps/web/.env.local`)

| Variável | O quê |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | URL da API |
| `NEXT_PUBLIC_ROOT_DOMAIN` | domínio raiz para subdomínios (ex.: `esqueleton.com.br`) |

## Perfis de banco (vários bancos locais)

`pnpm dev --<perfil>` roda a stack contra um Postgres isolado (container, porta e volume próprios):

- `scripts/dev.mjs` sobe `docker compose --profile <perfil> up -d` (tenta `docker compose`, `docker-compose` e `wsl docker compose` — nesta máquina o Docker roda dentro do WSL) e seta `PERFIL=<perfil>`.
- `apps/api/scripts/com-perfil.mjs` carrega `apps/api/.env.<perfil>` no lugar de `.env` (também aceita o perfil como argumento final: `db:migrate --loja1`).
- Perfis de exemplo: `loja1` (porta 5433) e `loja2` (porta 5434).
- Para criar um: duplicar um bloco `postgres-lojaX` no `docker-compose.yml` (nome/porta/volume novos) + criar `apps/api/.env.<perfil>`.
- Os `.env.*` reais são gitignorados; só os `.example` são versionados.

## Deploy — Web (Vercel)

1. Deploy de `apps/web` como projeto Next.js padrão.
2. Setar `NEXT_PUBLIC_API_URL` com a URL da API em produção.
3. **Subdomínios:** adicionar wildcard domain `*.plataforma.com` (Settings → Domains) + CNAME `*.plataforma.com` no DNS + `NEXT_PUBLIC_ROOT_DOMAIN=plataforma.com`.

## Deploy — API

### Vercel (serverless)

- Projeto separado; `vercel.json` roteia tudo para `src/vercel.ts` via `@vercel/node`.
- Setar `DATABASE_URL`, `CORS_ORIGIN`, `JWT_SECRET` e **`REDIS_URL`** (sem Redis, o rate limit é por instância — ver [Segurança](13-seguranca.md)).

### VPS

```bash
pnpm build && pnpm start
```

O `docker-compose.yml` da raiz é **só para Postgres local** — não é o deploy.

## Checklist de produção

- [ ] `JWT_SECRET` forte e definido
- [ ] `CORS_ORIGIN` correto (subdomínios de loja liberados)
- [ ] 5 variáveis `R2_*` definidas
- [ ] `REDIS_URL` definido (serverless)
- [ ] `MERCADOPAGO_ACCESS_TOKEN` + `MERCADOPAGO_WEBHOOK_SECRET` definidos
- [ ] `RESEND_API_KEY` + `FROM_EMAIL` + `FRONTEND_URL` definidos
- [ ] Wildcard domain + DNS para subdomínios
- [ ] Migrações aplicadas (`db:migrate`)

## Fim da wiki

[← Voltar ao início](00-inicio.md)
