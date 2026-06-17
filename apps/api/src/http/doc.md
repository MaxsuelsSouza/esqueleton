# http/ — Camada HTTP

Tudo que depende do Fastify: plugins, schemas de validação e rotas. **Esta camada não contém lógica de negócio** — delega para `domain/`.

## Regra de dependência

`http/` importa de `domain/` (services, guards) e `shared/` (validadores, prisma). Nunca o contrário.

## Subpastas

| Pasta | O que faz |
|-------|-----------|
| [`plugins/`](plugins/doc.md) | Extensões Fastify (JWT, store context, plan limits, session) |
| [`schemas/`](schemas/doc.md) | Validações Zod de entrada (body, params, query) |
| [`routes/`](routes/doc.md) | Handlers HTTP agrupados por feature |

## Fluxo de uma requisição

```
Cliente → Fastify
  1. helmet, cors, rateLimit (globais)
  2. Plugin resolve contexto:
     - Admin: jwt.plugin → app.authenticate → request.user.storeId
     - Público: store-context.plugin → resolveStore → request.store.id
  3. preHandlers opcionais:
     - requireOwner (role guard)
     - checkPlanLimit (plan limits)
     - rateLimit por rota
  4. Handler da rota:
     - Parse input com Zod (schema)
     - Chama service do domain/
     - Retorna resposta
  5. Error handler captura erros não tratados
```
