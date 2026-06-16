# Equipe (Usuários)

Página de gestão da equipe da loja — permite ao proprietário listar, convidar e remover membros com acesso ao painel administrativo.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza a lista de membros (e-mail, role, status de verificação), o formulário de convite (e-mail + senha temporária) e os botões de remover. |
| `page.hooks.ts` | Carrega a lista de usuários via `usersService`, gerencia o formulário de convite (via `authService.register` com token), a remoção de membros (via `usersService.delete`) e o redirecionamento caso o usuário não seja OWNER. |

## Fluxo de dados

`useAdminAuth` fornece `token` e `isOwner` → se não é OWNER, redireciona para `/admin/dashboard` → `usersService.list(token)` retorna os usuários da loja → view renderiza a lista.

Convite: `authService.register({ email, password }, token)` cria um novo STAFF na loja do token → recarrega a lista.

Remoção: `usersService.delete(userId, token)` remove o membro → atualiza a lista localmente (filter).

## Estados gerenciados

| Estado | Tipo | Descrição |
|--------|------|-----------|
| `users` | `User[]` | Lista de membros da loja |
| `loading` | `boolean` | Indica carregamento inicial |
| `error` | `string \| null` | Mensagem de erro geral |
| `showInvite` | `boolean` | Controla visibilidade do formulário de convite |
| `inviteEmail` | `string` | E-mail do novo membro a convidar |
| `invitePassword` | `string` | Senha temporária do novo membro |
| `inviting` | `boolean` | Indica se o convite está sendo enviado |
| `inviteError` | `string \| null` | Mensagem de erro específica do convite |
| `deletingId` | `string \| null` | ID do usuário sendo removido (desabilita o botão) |

## Ações do usuário

| Ação | Handler | O que faz |
|------|---------|-----------|
| Clicar em "Convidar" (cabeçalho) | `setShowInvite` | Alterna a visibilidade do formulário de convite |
| Submeter formulário de convite | `handleInvite` | Chama `authService.register` com token JWT (modo convite), limpa o formulário e recarrega a lista. |
| Clicar no ícone de lixeira de um membro | `handleDelete(userId)` | Pede confirmação, chama `usersService.delete`, remove o usuário da lista local. |

## Módulos utilizados

- `@/modules/auth` — `useAdminAuth` para token, role e estado de carregamento; `authService` para `register` (modo convite com token).
- `@/modules/users` — `usersService` para `list` e `delete`.
- `@esqueleton/shared` — tipo `User`.
- `next/navigation` — `useRouter` para redirecionar STAFF para fora da página.

## Observações

- Acesso exclusivo do OWNER. Se `isOwner` for `false` após a verificação, o hook redireciona para `/admin/dashboard`.
- O botão de remover não aparece para usuários com role OWNER (o proprietário não pode remover a si mesmo).
- Cada membro exibe se o e-mail não foi verificado ("E-mail não verificado").
- O OWNER tem ícone de escudo com fundo escuro; STAFF tem fundo cinza claro.
- Erros de e-mail duplicado (409) no convite são tratados com mensagem amigável.
