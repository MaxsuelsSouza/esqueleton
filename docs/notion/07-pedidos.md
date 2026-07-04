# 07 — Pedidos e Checkout via WhatsApp

[← Voltar ao início](00-inicio.md)

## O fluxo

1. O cliente monta a **sacola** em `/loja/[slug]/sacola` (estado de sessão — ver "Sessão" abaixo).
2. Pode aplicar um **cupom** (validado no servidor — ver [Precificação](06-precificacao.md)).
3. Ao finalizar, o web:
   - Registra o pedido via `POST /api/lojas/:slug/orders` (fire-and-forget);
   - Abre o **WhatsApp** com a mensagem do pedido pronta para enviar ao lojista.
4. O lojista acompanha os pedidos no painel admin.

## Validação server-side do pedido (anti-manipulação)

`POST /api/lojas/:slug/orders` (rate limit 10/min) **não confia em nada** que vem do cliente:

### 1. Aritmética (função pura `validateOrderArithmetic`)

```
lineTotal = unitPrice × quantity     (por item)
subtotal  = soma dos lineTotals
total     = subtotal − discount
```

Qualquer inconsistência → **400**.

### 2. Preço unitário contra o banco

Cada `unitPrice` é conferido contra o preço do produto **no banco**, levando em conta:

- Promoções ativas da loja;
- Cupom aplicado (se enviado);
- **Tolerância de 1 centavo** para arredondamento.

Pedido com preço manipulado → **400**.

### 3. Cupom e limite de usos

Se o pedido usa cupom, o servidor incrementa `usedCount` **escopado à loja** — é isso que garante o `maxUses` na prática.

### 4. Limite do plano

O preHandler `checkPlanLimit('maxOrdersPerMonth')` roda nessa rota — o `storeId` vem do slug (rota pública). Limite atingido → 403 (ver [Billing](08-billing.md)).

## Número do pedido

`orderNumber` é gerado **no cliente** e protegido pelo unique composto `@@unique([storeId, orderNumber])`. Risco aceito: uma colisão faz o create (fire-and-forget) falhar silenciosamente — documentado em [Segurança](13-seguranca.md).

## Clientes

`Customer` com unique `@@unique([storeId, phone])` — o mesmo telefone pode existir em lojas diferentes, mas não duplicado na mesma loja. `POST` público com rate limit 10/min.

## Sacola e favoritos (sessão)

As rotas públicas de sessão (`http/routes/session/`) guardam sacola e favoritos por sessão:

- `SessionStore` (`domain/session/store/session-store.ts`) é uma interface com **duas implementações**: Redis (produção/serverless) e memória (dev).
- O plugin `session.plugin.ts` escolhe a implementação conforme `REDIS_URL`.

## Analytics

Eventos públicos (visitas, visualizações) entram por `POST /api/lojas/:slug/analytics` (rate limit 120/min). A agregação (`computeAnalyticsSummary`, ~270 linhas em `domain/analytics/`) alimenta o dashboard admin.

## Próxima página

→ [08 — Billing e Assinaturas](08-billing.md)
