# shared/ — Infraestrutura transversal

Camada mais baixa da API. Contém serviços de infraestrutura usados por `domain/` e `http/`. **Não contém lógica de negócio.**

## Regra de dependência

`shared/` não importa nada de `domain/` nem de `http/`. Só depende de libs externas (`zod`, `@prisma/client`, `resend`, `ioredis`, `fastify-plugin`).

## Subpastas

| Pasta | O que faz |
|-------|-----------|
| [`database/`](database/doc.md) | Conexão Prisma + tenant guard (multi-tenancy) |
| [`email/`](email/doc.md) | Envio de e-mail via Resend (no-op sem API key) |
| [`cache/`](cache/doc.md) | Conexão Redis para rate limiting distribuído |
| [`validation/`](validation/doc.md) | Validadores Zod reutilizáveis (ID, data, slug, imagem, etc.) |
| [`errors/`](errors/doc.md) | Error handler global do Fastify |

## Fluxo geral

```
request → Fastify
  → error-handler.ts captura erros não tratados
  → prisma.plugin.ts fornece app.prisma (com tenant guard)
  → resend.plugin.ts fornece app.email.send()
  → schemas.ts valida inputs em cada rota
  → rate-limit-redis.ts compartilha contadores entre instâncias
```

Todos os plugins são registrados em `app.ts` na ordem correta (prisma → jwt → resend → etc.).
