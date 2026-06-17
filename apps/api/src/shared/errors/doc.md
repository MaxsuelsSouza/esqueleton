# shared/errors/ — Error handler global

Tratamento centralizado de erros do Fastify.

## Arquivos

### `error-handler.ts`

**Exporta:** `registerErrorHandler(app: FastifyInstance): void`

Registra o `setErrorHandler` do Fastify. É chamado no final de `app.ts`, depois de todas as rotas.

**Comportamento:**

| Tipo de erro | Status | Resposta |
|-------------|--------|----------|
| `ZodError` (validação) | 400 | `{ message: 'Dados inválidos', errors: [...] }` |
| Erro < 500 (ex: 404, 403) | original | `{ message: error.message }` |
| Erro >= 500 (interno) | 500 | `{ message: 'Erro interno do servidor' }` |

**Segurança:** erros 5xx nunca expõem stack trace, nome de tabela ou detalhes do banco. A mensagem genérica é intencional.

```typescript
// Em app.ts (última chamada)
registerErrorHandler(app)
```

## Fluxo

```
Rota lança erro (throw, Zod, Prisma, etc.)
  → Fastify captura
  → registerErrorHandler verifica o tipo:
     → ZodError? → 400 com detalhes dos campos
     → statusCode < 500? → retorna a mensagem original
     → statusCode >= 500? → loga erro, retorna mensagem genérica
```

## Por que as rotas não precisam de try/catch

O Fastify captura erros de handlers `async` automaticamente. Quando uma rota faz `featureSchema.parse(request.body)` e o body é inválido, o Zod lança `ZodError` — o error handler intercepta e retorna 400 sem que a rota precise tratar.

Exceção: operações fire-and-forget usam `.catch(() => {})` explícito porque não devem derrubar a resposta principal.
