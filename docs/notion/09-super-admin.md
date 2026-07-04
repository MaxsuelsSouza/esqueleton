# 09 — Super Admin (Plataforma)

[← Voltar ao início](00-inicio.md)

## O que é

O super-admin é o **operador da plataforma** — enxerga todas as lojas, gerencia planos e acompanha métricas (incluindo MRR).

## Como alguém vira super-admin

`User.isSuperAdmin` é definido **manualmente no banco** — nenhuma UI cria:

```sql
UPDATE "User" SET "isSuperAdmin" = true WHERE email = '...';
```

- O JWT carrega a flag (opcional — tokens antigos sem ela caem em 403).
- `requireSuperAdmin` (`domain/identity/guards/super-admin.guard.ts`) protege **todas** as rotas `/api/super/*`.

## Rotas da plataforma (`/api/super/*`)

| Recurso | Operações |
|---------|-----------|
| Lojas | listar, detalhar, PATCH de status (suspender/reativar) e de plano |
| Planos | CRUD — a criação de plano pago cria o *preapproval plan* no MercadoPago |
| Usuários | listagem de todos os usuários da plataforma |
| Métricas | totais, **MRR** e assinaturas por plano |

**Trava de consistência:** um plano não pode ser desativado enquanto houver lojas com assinatura `ACTIVE`/`PENDING`/`PAUSED` nele.

## `prismaRaw` — a exceção ao tenant guard

Rotas super usam `app.prismaRaw` (cliente Prisma **sem** tenant guard) porque suas queries são cross-store **por design**.

> ⚠️ **Nunca** use `prismaRaw` em rotas de loja — ele desliga a proteção de isolamento descrita em [Multi-tenancy](03-multi-tenancy.md).

## Interface web

A seção "Plataforma" na navegação admin aparece **apenas** quando `admin_is_super_admin` está no localStorage (conveniência de UI — a autorização real é server-side):

| Página | O quê |
|--------|-------|
| `/admin/super/lojas` | busca, suspender/reativar, trocar plano |
| `/admin/super/planos` | CRUD de planos |
| `/admin/super/usuarios` | todos os usuários |
| `/admin/super/metricas` | totais, MRR, assinaturas por plano |

## Próxima página

→ [10 — Imagens (Cloudflare R2)](10-imagens-r2.md)
