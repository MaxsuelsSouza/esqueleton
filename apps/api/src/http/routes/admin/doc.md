# routes/admin/ — Perfil da loja e equipe

Gestão do perfil público e dos membros da equipe.

## Arquivos

### `store-profile.routes.ts`

**Exporta:** `storeProfilePublicRoutes`, `storeProfileAdminRoutes`

**Rotas públicas** (`/api/lojas/:slug/store-profile`):

| Rota | O que faz |
|------|-----------|
| `GET /` | Retorna perfil público da loja (nome, logo, descrição, WhatsApp, cores, horários) |

**Rotas admin** (`/api/store-profile`):

| Rota | Auth | preHandlers | O que faz |
|------|------|-------------|-----------|
| `GET /` | JWT | — | Retorna perfil completo da loja |
| `PUT /` | JWT | requireOwner | Atualiza perfil (upsert — cria se não existir) |

**PUT é upsert:** usa `prisma.storeProfile.upsert` com `where: { storeId }`. Apenas OWNER pode editar.

### `user.routes.ts`

**Exporta:** `userAdminRoutes` (prefixo `/api/users`, somente admin OWNER)

| Rota | Auth | preHandlers | O que faz |
|------|------|-------------|-----------|
| `GET /` | JWT | requireOwner | Lista membros da equipe (id, email, role, createdAt) |
| `DELETE /:id` | JWT | requireOwner | Remove membro da equipe (não pode remover a si mesmo) |

**Segurança:** OWNER não pode se auto-deletar (verificação `id === request.user.sub`).
