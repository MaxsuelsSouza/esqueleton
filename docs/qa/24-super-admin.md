# QA — Super Admin

**Commits relacionados:** `91810b5`
**Data:** 2026-06-12

## Descrição

Super-admin é um flag manual no banco (`User.isSuperAdmin`). Dá acesso a rotas `/api/super/*` para gestão cross-store: lojas, planos, usuários e métricas da plataforma.

## Pré-condições

- Usuário com `isSuperAdmin = true` no banco:
  ```sql
  UPDATE "User" SET "isSuperAdmin" = true WHERE email = 'admin@plataforma.com';
  ```
- `admin_is_super_admin` em localStorage para visibilidade do menu

## Casos de Teste

### CT-01: Acesso ao painel de plataforma
1. Logar como super-admin
2. **Esperado:** Seção "Plataforma" visível no menu (lojas, planos, usuários, métricas).

### CT-02: Gestão de lojas
1. Acessar `/admin/super/lojas`
2. **Esperado:** Lista todas as lojas da plataforma. Busca funciona. Pode suspender/reativar e trocar plano.

### CT-03: Suspender loja
1. Alterar status de loja para SUSPENDED
2. **Esperado:** Loja suspensa. Catálogo público retorna 404.

### CT-04: Reativar loja
1. Alterar status para ACTIVE
2. **Esperado:** Loja reativada. Catálogo volta a funcionar (se trial ou assinatura ok).

### CT-05: Trocar plano de loja
1. Alterar plano de uma loja
2. **Esperado:** Subscription atualizada. Novos limites aplicados.

### CT-06: CRUD de planos
1. Acessar `/admin/super/planos`
2. Criar/editar/excluir plano
3. **Esperado:** CRUD funciona. Plano com assinaturas ativas não pode ser desativado.

### CT-07: Bloquear desativação de plano com assinaturas ativas
1. Tentar desativar plano com lojas ACTIVE/PENDING/PAUSED
2. **Esperado:** Bloqueado — plano tem assinaturas vinculadas.

### CT-08: Criar plano com MercadoPago
1. Criar plano com `priceInCents > 0`
2. **Esperado:** Plano de preapproval criado no MercadoPago. `mercadoPagoId` salvo.

### CT-09: Lista de usuários da plataforma
1. Acessar `/admin/super/usuarios`
2. **Esperado:** Todos os usuários de todas as lojas listados.

### CT-10: Métricas da plataforma
1. Acessar `/admin/super/metricas`
2. **Esperado:** Totais (lojas, usuários, produtos), MRR, assinaturas por plano.

### CT-11: Acesso negado para não-super-admin
1. Tentar acessar `/api/super/*` com token sem isSuperAdmin
2. **Esperado:** 403 Forbidden (`requireSuperAdmin`).

### CT-12: Token antigo sem flag isSuperAdmin
1. Usar JWT que foi gerado antes de `isSuperAdmin` ser setado
2. **Esperado:** 403 — flag não está no token.

### CT-13: Super routes usam prismaRaw
1. (Verificação de código) Super routes usam `app.prismaRaw`
2. **Esperado:** Sem tenant guard — queries são cross-store por design.

## Páginas Super Admin

| Rota | Função |
|------|--------|
| `/admin/super/lojas` | Gestão de lojas |
| `/admin/super/planos` | CRUD de planos |
| `/admin/super/usuarios` | Todos os usuários |
| `/admin/super/metricas` | Métricas e MRR |

## Critérios de Aceite

- [ ] Apenas super-admin acessa rotas `/api/super/*`
- [ ] Gestão de lojas (suspender/reativar/trocar plano) funciona
- [ ] CRUD de planos funciona
- [ ] Plano com assinaturas não pode ser desativado
- [ ] Métricas calculadas corretamente (MRR)
- [ ] 403 para não-super-admin
