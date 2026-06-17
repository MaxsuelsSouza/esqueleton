# domain/notification/ — Notificações automáticas

Detecção de entidades expiradas e criação de notificações.

## Arquivos

### `services/notification.service.ts`

| Export | O que faz |
|--------|-----------|
| `checkExpiredEntities(prisma, storeId)` | Verifica promoções, cupons e destaques expirados e cria notificações |

**O que é considerado expirado:**

| Entidade | Condição |
|----------|----------|
| Promoção | `endDate` no passado, ou `endDate` = hoje e `endTime` < hora atual |
| Cupom | `endDate` no passado, ou `usedCount >= maxUses` |
| Destaque | `endDate` no passado, ou `endDate` = hoje e `endTime` < hora atual |

**Tipos de notificação criados:**
- `PROMOTION_ENDED` — `"Promoção "nome" expirou"`
- `COUPON_ENDED` — `"Cupom "CODE" encerrado"`
- `FEATURED_ENDED` — `"Destaque "título" expirou"`

**Deduplicação:** usa `createMany({ skipDuplicates: true })` — a unique `@@unique([storeId, type, entityId])` impede duplicatas. Se a notificação já existe, é ignorada silenciosamente.

**Retorna:** número de notificações criadas.

```typescript
// Chamado pela rota GET /api/notifications (fire-and-forget)
checkExpiredEntities(app.prisma, storeId).catch(() => {})
```
