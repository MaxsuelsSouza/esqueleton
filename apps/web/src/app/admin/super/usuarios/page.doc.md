# Super Admin - Usuarios da Plataforma

Pagina que lista todos os usuarios de todas as lojas da plataforma, com busca por e-mail e paginacao.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza tabela de usuarios com e-mail, loja, papel (Plataforma/Proprietario/Equipe) e status de verificacao de e-mail. Inclui busca e paginacao. |
| `page.hooks.ts` | Gerencia estado de listagem (busca, paginacao), carrega usuarios via `superService.listUsers` e expoe handlers de navegacao. |

## Fluxo de dados

`useAdminAuth()` verifica token e `isSuperAdmin` → redireciona se nao for super-admin → `superService.listUsers(token, { page, search })` busca usuarios paginados → dados chegam a view como `users` e `total`.

## Estados gerenciados

| Estado | Tipo | Descricao |
|--------|------|-----------|
| `users` | `SuperUser[]` | Lista de usuarios da pagina atual |
| `total` | `number` | Total de usuarios encontrados |
| `page` | `number` | Pagina atual |
| `perPage` | `number` | Itens por pagina (vem da API, padrao 20) |
| `search` | `string` | Texto de busca por e-mail |
| `loading` | `boolean` | Carregamento inicial |
| `error` | `string \| null` | Mensagem de erro ao carregar |

## Acoes do usuario

| Acao | Handler | O que faz |
|------|---------|-----------|
| Digitar na busca | `handleSearchChange` | Filtra usuarios por e-mail e volta para a primeira pagina |
| Clicar "Anterior" | `handlePreviousPage` | Vai para a pagina anterior |
| Clicar "Proxima" | `handleNextPage` | Vai para a proxima pagina |

## Modulos utilizados

- `@/modules/auth/hooks/useAdminAuth` — verifica autenticacao e flag `isSuperAdmin`
- `@/modules/super/services/super.service` — chamada `listUsers` da API de super-admin
- `@esqueleton/shared` — tipo `SuperUser`

## Observacoes

- Acesso restrito a super-admins.
- Pagina somente leitura — nao ha acoes de edicao ou exclusao de usuarios.
- Super-admins sao identificados visualmente com icone `ShieldCheck` preenchido e badge "Plataforma".
- O papel do usuario e exibido como "Proprietario" (OWNER), "Equipe" (STAFF) ou "Plataforma" (isSuperAdmin).
- A verificacao de e-mail e mostrada como "Sim" (verde) ou "Pendente" (laranja).
