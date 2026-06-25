# QA — Multi-tenancy

**Commits relacionados:** `6f4384e`
**Data:** 2026-06-11

## Descrição

Cada loja (tenant) é identificada por um `storeId`. Todo modelo de dados tem `storeId` obrigatório (exceto Store, User, Plan, PasswordResetToken, EmailVerificationToken). O tenant guard impede consultas sem filtro de storeId.

## Casos de Teste

### CT-01: Isolamento de dados entre lojas
1. Criar dois produtos em lojas diferentes (Loja A e Loja B)
2. Consultar produtos da Loja A
3. **Esperado:** Apenas produtos da Loja A retornados. Nenhum dado da Loja B visível.

### CT-02: Rotas públicas filtram por slug
1. `GET /api/lojas/loja-a/products`
2. **Esperado:** Retorna apenas produtos da loja com slug `loja-a`.

### CT-03: Rotas admin filtram por storeId do JWT
1. Logar como admin da Loja A
2. `GET /api/products` (com JWT)
3. **Esperado:** Retorna apenas produtos da Loja A (storeId extraído do JWT).

### CT-04: Tenant guard bloqueia query sem storeId
1. (Teste unitário) Fazer query em modelo tenant-scoped sem incluir `storeId`
2. **Esperado:** Tenant guard THROWS — impede a query.

### CT-05: Update/delete com ownership pattern
1. Tentar atualizar produto de outra loja via `updateMany({ where: { id, storeId } })`
2. **Esperado:** `count === 0` → 404 Not Found (o produto existe, mas não pertence à loja).

### CT-06: Uniques compostos (storeId + campo)
1. Criar cupom com código "PROMO10" na Loja A
2. Criar cupom com código "PROMO10" na Loja B
3. **Esperado:** Ambos criados com sucesso (unique é por loja).
4. Criar segundo cupom com código "PROMO10" na Loja A
5. **Esperado:** Erro — violação de unique constraint.

### CT-07: Perfis de banco local
1. Rodar `pnpm dev --loja1`
2. **Esperado:** Conecta ao banco postgres-loja1 (porta 5433) com dados isolados.

## Modelos com Unique Composto

| Modelo | Campos |
|--------|--------|
| Coupon | `@@unique([storeId, code])` |
| Customer | `@@unique([storeId, phone])` |
| Order | `@@unique([storeId, orderNumber])` |
| Notification | `@@unique([storeId, type, entityId])` |

## Critérios de Aceite

- [ ] Dados de uma loja nunca aparecem em outra
- [ ] Tenant guard bloqueia queries sem storeId
- [ ] Uniques compostos funcionam por loja
- [ ] Ownership pattern (updateMany/deleteMany) funciona
- [ ] Perfis de banco local funcionam
