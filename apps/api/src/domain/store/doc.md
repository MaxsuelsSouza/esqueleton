# domain/store/ — Disponibilidade da loja

Regra "pagou, usou" — verifica se a loja pode servir o catálogo público.

## Arquivos

### `services/store-availability.service.ts`

| Export | O que faz |
|--------|-----------|
| `isStoreAvailable(prisma, store)` | Retorna `true` se a loja está disponível para o público |

**Uma loja está disponível quando:**

1. Está dentro dos **7 dias de teste** (contados a partir de `store.createdAt`), **OU**
2. Tem uma **assinatura ativa** (`subscription.status === 'ACTIVE'`)

Se nenhuma das condições for verdadeira, o `resolveStore` (store-context.plugin) responde **503** ao visitante — mensagem genérica para não revelar que é problema de billing.

**O admin continua acessível** — o bloqueio é apenas no catálogo público. O lojista precisa acessar o painel para assinar.

```typescript
// Usado pelo store-context.plugin.ts
const disponivel = await isStoreAvailable(app.prisma, store)
if (!disponivel) {
  return reply.status(503).send({ message: 'Ops! Aconteceu um erro...' })
}
```

**Dependência:** importa `TRIAL_MS` de `domain/billing/trial.ts`.
