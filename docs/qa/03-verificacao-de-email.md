# QA — Verificação de E-mail

**Commits relacionados:** `4550155`, `3c1c9f4`
**Data:** 2026-06-12, 2026-06-23

## Descrição

Novos usuários começam com `emailVerified: false`. Um e-mail de verificação é enviado no cadastro. Após 7 dias sem verificar, o admin fica bloqueado (exceto a rota de reenvio). Em dev, a verificação é ignorada para não travar o painel local.

## Pré-condições

- Usuário recém-cadastrado (emailVerified = false)
- `RESEND_API_KEY` configurada (ou verificar logs)

## Casos de Teste

### CT-01: Verificar e-mail com token válido
1. Clicar no link de verificação recebido por e-mail
2. Acessar `/admin/verificar-email?token=<token>`
3. **Esperado:** `emailVerified` atualizado para `true`. Mensagem de sucesso.

### CT-02: Token de verificação expirado (>7 dias)
1. Usar token com mais de 7 dias
2. **Esperado:** Erro — token expirado.

### CT-03: Token já usado
1. Clicar no link de verificação pela segunda vez
2. **Esperado:** Erro — token já utilizado.

### CT-04: Banner de verificação no admin
1. Logar com e-mail não verificado
2. **Esperado:** Banner amarelo `EmailVerificationBanner` aparece no topo do admin.

### CT-05: Bloqueio após 7 dias sem verificar
1. Usuário com `emailVerified: false` há mais de 7 dias
2. Tentar acessar qualquer rota admin
3. **Esperado:** Bloqueado por `requireVerifiedEmail` (enforced em `app.authenticate`). Apenas a rota de reenvio funciona.

### CT-06: Reenviar e-mail de verificação
1. Estar logado com e-mail não verificado
2. `POST /api/auth/resend-verification` com JWT
3. **Esperado:** Novo e-mail enviado. Rate limit: 2/min.

### CT-07: Dev mode — verificação ignorada
1. Em ambiente de desenvolvimento (sem `NODE_ENV=production`)
2. **Esperado:** Verificação de e-mail não bloqueia o painel (fix `3c1c9f4`).

## Validações de API

| Endpoint | Método | Rate Limit | Auth |
|----------|--------|------------|------|
| `/api/auth/verify-email` | POST | 10/min | Não |
| `/api/auth/resend-verification` | POST | 2/min | JWT |

## Observações

- `EmailVerificationToken` **não tem storeId** — lookup global por token.
- A rota `resend-verification` usa `config: { skipEmailVerification: true }` para funcionar mesmo quando o bloqueio está ativo.

## Critérios de Aceite

- [ ] Novos usuários começam com emailVerified = false
- [ ] Token de verificação expira em 7 dias
- [ ] Banner aparece no admin quando e-mail não verificado
- [ ] Bloqueio automático após 7 dias sem verificação
- [ ] Reenvio funciona e respeita rate limit
