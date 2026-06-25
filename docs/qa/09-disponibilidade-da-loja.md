# QA — Disponibilidade da Loja ("Pagou, Usou")

**Commits relacionados:** `4a81ec4`
**Data:** 2026-06-12

## Descrição

O catálogo público da loja só funciona durante o trial de 7 dias ou com assinatura ativa. Fora disso, `resolveStore` retorna 503 com erro genérico. O admin permanece acessível para que o dono possa assinar.

## Casos de Teste

### CT-01: Loja no período de trial (< 7 dias)
1. Criar nova loja
2. Acessar catálogo público
3. **Esperado:** Catálogo funciona normalmente. Trial de 7 dias contado a partir de `Store.createdAt`.

### CT-02: Trial expirado sem assinatura
1. Loja com mais de 7 dias sem assinatura ativa
2. Acessar catálogo público
3. **Esperado:** 503 "Ops! Aconteceu um erro..." (mensagem genérica — cliente não sabe que é billing).

### CT-03: Assinatura ativa
1. Loja com `Subscription.status = ACTIVE`
2. Acessar catálogo público
3. **Esperado:** Catálogo funciona normalmente (independente do trial).

### CT-04: Assinatura cancelada/pausada
1. Loja com assinatura CANCELLED ou PAUSED
2. Trial expirado
3. **Esperado:** 503 no catálogo público.

### CT-05: Admin permanece acessível
1. Loja com trial expirado e sem assinatura
2. Acessar `/admin`
3. **Esperado:** Painel admin funciona. OWNER pode assinar um plano.

### CT-06: Erro genérico no frontend
1. Loja indisponível (503)
2. **Esperado:** Web mostra tela cheia de erro via `store-profile-context`. Não menciona billing.

### CT-07: Loja com status SUSPENDED
1. Super-admin suspende loja (`Store.status = SUSPENDED`)
2. **Esperado:** `resolveStore` retorna 404 "Loja não encontrada".

## Critérios de Aceite

- [ ] Trial de 7 dias funciona a partir do createdAt
- [ ] Sem assinatura após trial → 503 genérico
- [ ] Com assinatura ativa → catálogo funciona
- [ ] Admin sempre acessível (para o dono assinar)
- [ ] Mensagem de erro não revela que é problema de billing
- [ ] Loja SUSPENDED → 404
