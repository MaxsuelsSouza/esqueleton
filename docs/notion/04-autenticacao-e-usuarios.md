# 04 — Autenticação e Usuários

[← Voltar ao início](00-inicio.md)

## Cadastro (`POST /api/auth/register`)

A rota tem **dois modos**:

| Modo | Quando | O que faz |
|------|--------|-----------|
| **Signup público** | Sem token | Cria `Store` + `StoreProfile` + primeiro `User` (role `OWNER`) em **uma transação**. Body: `email`, `password`, `storeName`, `storeSlug`. |
| **Convite de equipe** | Com JWT válido | Cria outro usuário **na loja do chamador**, sempre com role `STAFF`. Exige role OWNER (`requireOwner`). |

Slugs são validados por `slugSchema` (minúsculas/números/hífen, 3–40 chars) + lista de reservados (`admin`, `api`, `loja`, …). Rate limit: 5/min.

## Login (`POST /api/auth/login`)

Retorna `{ token, role, emailVerified, isSuperAdmin, store: { slug, name } }`.

- Payload do JWT: `{ sub, email, storeId, role, emailVerified }` — tokens **sem `storeId` ou `role` são rejeitados** por `app.authenticate`.
- Expiração: **1 dia**. `JWT_SECRET` é obrigatório em produção (a API se recusa a subir sem ele).
- Rate limit: 10/min por IP **+** limite por e-mail (10 tentativas / 15 min) contra brute force distribuído.
- Logins falhos são logados com `app.log.warn` (e-mail + IP).

O web salva no `localStorage`: `admin_token`, `admin_store_slug`, `admin_store_name`, `admin_role`, `admin_email_verified`, `admin_is_super_admin`.

## Roles: OWNER × STAFF

| Capacidade | OWNER | STAFF |
|------------|-------|-------|
| Produtos, categorias, promoções, cupons, pedidos | ✅ | ✅ |
| Editar perfil da loja (`PUT /api/store-profile`) | ✅ | ❌ 403 |
| Convidar/remover membros (`/api/users`) | ✅ | ❌ 403 |
| Assinar/cancelar plano (`/api/billing/*`) | ✅ | ❌ 403 |
| Rotas WhatsApp catalog (test/status/sync) | ✅ | ❌ 403 |

- O primeiro usuário da loja é sempre `OWNER`; convidados são sempre `STAFF`.
- A guarda é **server-side**: `requireOwner` (`domain/identity/guards/role.guard.ts`) responde 403. O web só esconde itens de menu lendo `role` do localStorage — quem acessar a URL direto é barrado pela API.

## Reset de senha

1. `POST /api/auth/forgot-password` (3/min) — recebe `{ email }`, cria `PasswordResetToken` (32 bytes hex, validade 1h), envia link via Resend e **sempre responde 200** (não revela se o e-mail existe). Tokens antigos do mesmo usuário são apagados a cada novo pedido.
2. `POST /api/auth/reset-password` (5/min) — recebe `{ token, password }`, valida (não expirado, não usado), troca a senha e marca o token como usado.

Páginas web: `/admin/esqueci-senha` e `/admin/redefinir-senha?token=xxx`.

⚠️ `PasswordResetToken` **não tem `storeId`** — o lookup por token é global (exceção documentada do tenant guard).

## Verificação de e-mail

- Usuários nascem com `emailVerified: false`.
- `POST /api/auth/verify-email` (10/min) valida o token do e-mail de verificação (`EmailVerificationToken`, validade 7 dias, uso único, lookup global).
- `POST /api/auth/resend-verification` (2/min, JWT) reenvia o e-mail.
- **Após 7 dias sem verificar**, `requireVerifiedEmail` bloqueia as rotas admin — aplicado **dentro de `app.authenticate`**, então toda rota admin ganha a verificação automaticamente. Rotas que precisam continuar acessíveis marcam `config: { skipEmailVerification: true }` (hoje, só o resend).
- O web mostra um banner amarelo (`EmailVerificationBanner`) enquanto não verificado. Página: `/admin/verificar-email?token=xxx`.

## E-mail (Resend)

`shared/email/resend.plugin.ts` expõe `app.email.send()`. **Sem `RESEND_API_KEY`, os e-mails são apenas logados** (no-op em dev). Templates HTML em `shared/email/templates.ts`.

## Super Admin

`User.isSuperAdmin` é uma flag de plataforma definida **manualmente no banco** — nenhuma UI a cria. Detalhes em [09 — Super Admin](09-super-admin.md).

## Riscos aceitos (documentados)

- JWT no `localStorage` — XSS poderia roubá-lo (alternativa: cookie httpOnly).
- Sem revogação server-side — logout só limpa o browser; o token vale até expirar (1 dia).

Mais em [13 — Segurança](13-seguranca.md).

## Próxima página

→ [05 — Catálogo](05-catalogo.md)
