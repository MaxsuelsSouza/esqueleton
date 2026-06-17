# routes/auth/ — Autenticação e identidade

Registro, login, reset de senha e verificação de e-mail.

## Arquivos

### `auth.routes.ts`

**Exporta:** `authRoutes` (prefixo `/api/auth`)

| Rota | Auth | Rate limit | O que faz |
|------|------|-----------|-----------|
| `POST /api/auth/register` (sem JWT) | — | 5/min | Signup SaaS: cria loja + perfil + owner em transação |
| `POST /api/auth/register` (com JWT) | JWT + OWNER | 5/min | Convida membro (STAFF) para a loja |
| `POST /api/auth/login` | — | 10/min IP + 10/15min email | Retorna JWT + dados da loja |

**Login retorna:** `{ token, role, emailVerified, isSuperAdmin, store: { slug, name } }`

**Registro (signup) retorna:** `{ token, role, emailVerified, store: { slug, name } }` — envia e-mail de verificação (fire-and-forget).

**Registro (invite) retorna:** `{ id, email, role }` — envia e-mail de verificação, verifica `checkPlanLimit('maxUsers')`.

### `password-reset.routes.ts`

**Exporta:** `passwordResetRoutes` (prefixo `/api/auth`)

| Rota | Rate limit | O que faz |
|------|-----------|-----------|
| `POST /api/auth/forgot-password` | 3/min | Gera token (1h), envia e-mail. **Sempre retorna 200** |
| `POST /api/auth/reset-password` | 5/min | Valida token, atualiza senha, marca token usado |

Token: `crypto.randomBytes(32).toString('hex')`, único, 1h de validade. Tokens anteriores do mesmo user são deletados.

### `email-verification.routes.ts`

**Exporta:** `emailVerificationRoutes` (prefixo `/api/auth`)

| Rota | Auth | Rate limit | O que faz |
|------|------|-----------|-----------|
| `POST /api/auth/verify-email` | — | 10/min | Valida token e marca e-mail como verificado |
| `POST /api/auth/resend-verification` | JWT | 2/min | Reenvia e-mail de verificação |

Token: `crypto.randomBytes(32).toString('hex')`, único, 7 dias. `resend-verification` usa `skipEmailVerification: true` (a rota precisa funcionar mesmo com e-mail não verificado).

## Testes

- `auth.routes.test.ts` — login, registro (signup e invite), validações
- `password-reset.test.ts` — forgot, reset, token expirado/usado
- `email-verification.test.ts` — verify, resend
