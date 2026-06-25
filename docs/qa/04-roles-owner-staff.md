# QA — Papéis OWNER e STAFF

**Commits relacionados:** `4550155`, `a6da62e`
**Data:** 2026-06-12, 2026-06-13

## Descrição

Cada usuário tem um papel: OWNER (dono da loja) ou STAFF (colaborador). O primeiro usuário de uma loja é sempre OWNER. Usuários adicionais são STAFF. Certas ações são restritas ao OWNER.

## Casos de Teste

### CT-01: Primeiro usuário é OWNER
1. Criar uma nova loja via signup público
2. **Esperado:** Usuário criado com `role: OWNER`.

### CT-02: Usuário convidado é STAFF
1. OWNER convida novo usuário via `POST /api/auth/register` (com JWT)
2. **Esperado:** Novo usuário criado com `role: STAFF`.

### CT-03: OWNER acessa gestão de equipe
1. Logar como OWNER
2. Acessar `/admin/usuarios`
3. **Esperado:** Lista de membros da loja visível. Pode convidar e remover.

### CT-04: STAFF não acessa gestão de equipe
1. Logar como STAFF
2. Tentar acessar `/admin/usuarios`
3. **Esperado:** Item "Equipe" não aparece no menu. Se acessar diretamente, API retorna 403.

### CT-05: STAFF não pode alterar perfil da loja
1. Logar como STAFF
2. `PUT /api/store-profile`
3. **Esperado:** 403 Forbidden (requireOwner).

### CT-06: STAFF não pode deletar usuários
1. `DELETE /api/users/:id` com token de STAFF
2. **Esperado:** 403 Forbidden.

### CT-07: OWNER não pode deletar a si mesmo
1. OWNER tenta `DELETE /api/users/:id` com seu próprio ID
2. **Esperado:** Erro — não pode remover o próprio dono.

### CT-08: Role lido do JWT (não do localStorage)
1. Verificar que o servidor usa `request.user.role` do JWT
2. Alterar `admin_role` no localStorage manualmente
3. **Esperado:** A UI pode mudar, mas a API rejeita com 403 nas rotas protegidas.

## Rotas protegidas por OWNER

| Rota | Método | Restrição |
|------|--------|-----------|
| `PUT /api/store-profile` | PUT | OWNER only |
| `POST /api/auth/register` (com JWT) | POST | OWNER only |
| `GET /api/users` | GET | OWNER only |
| `DELETE /api/users/:id` | DELETE | OWNER only |
| `POST /api/billing/subscribe` | POST | OWNER only |
| `POST /api/billing/cancel` | POST | OWNER only |

## Critérios de Aceite

- [ ] Primeiro usuário da loja é OWNER
- [ ] Convites criam STAFF
- [ ] Rotas protegidas retornam 403 para STAFF
- [ ] UI esconde itens de menu conforme role
- [ ] Mudança de role no localStorage não bypassa a API
