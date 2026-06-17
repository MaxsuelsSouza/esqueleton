# domain/order/ — Validação de pedidos

Validação aritmética para impedir totais manipulados.

## Arquivos

### `services/order.service.ts`

| Export | O que faz |
|--------|-----------|
| `validateOrderArithmetic(data)` | Confere que os totais do pedido batem |

**Função pura** — sem banco, sem HTTP. Recebe os dados do pedido e retorna `true` se a aritmética está correta.

**Verificações (tolerância de 1 centavo para arredondamentos):**

1. Cada item: `lineTotal ≈ unitPrice × quantity`
2. Subtotal: `subtotal ≈ soma dos lineTotals`
3. Total: `total ≈ subtotal − discount`
4. Desconto não pode ser maior que o subtotal

```typescript
// Uso na rota POST /api/lojas/:slug/orders
if (!validateOrderArithmetic(data)) {
  return reply.status(400).send({ message: 'Os valores do pedido não conferem.' })
}
```

**Por que validar no servidor:** o `unitPrice` vem do cliente. Embora o preço não seja recomputado do banco (risco aceito), a aritmética é conferida para impedir que alguém monte uma requisição com totais falsos.
