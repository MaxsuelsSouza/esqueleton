# domain/pricing/ — Validação de cupons

Regras de negócio para verificar se um cupom pode ser usado.

## Arquivos

### `services/coupon.service.ts`

| Export | O que faz |
|--------|-----------|
| `isCouponUsable(coupon)` | Verifica se o cupom é válido para uso |

**Regras verificadas (nesta ordem):**

1. `active === false` → `"Este cupom não está disponível."`
2. `startDate` no futuro → `"Este cupom não está disponível."`
3. `endDate` no passado → `"Este cupom está expirado."`
4. `usedCount >= maxUses` → `"Este cupom atingiu o limite de usos."`
5. Tudo ok → `{ valid: true }`

**Função pura** — não acessa banco. Recebe o registro do cupom já consultado.

```typescript
// Uso na rota GET /api/lojas/:slug/coupons/codigo/:code
const coupon = await app.prisma.coupon.findUnique({ where: { storeId_code: { storeId, code } } })
const result = isCouponUsable(coupon)
if (!result.valid) return reply.status(400).send({ message: result.reason })
```

**Retorno:** `{ valid: boolean, reason?: string }`
