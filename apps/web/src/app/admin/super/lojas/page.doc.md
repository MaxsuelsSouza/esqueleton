# Super Admin - Lojas da Plataforma

Pagina de gestao de todas as lojas cadastradas na plataforma, acessivel apenas por super-admins.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza a tabela de lojas com busca, filtro por status, seletor de plano e botao de suspender/reativar. Inclui paginacao. |
| `page.hooks.ts` | Gerencia estado de listagem (busca, filtro, paginacao), carrega lojas e planos via `superService`, e expoe handlers para alternar status e trocar plano de uma loja. |

## Fluxo de dados

`useAdminAuth()` verifica token e `isSuperAdmin` → redireciona para `/admin/dashboard` se nao for super-admin → `superService.listStores(token, { page, search, status })` busca lojas paginadas da API → `superService.listPlans(token)` busca planos disponiveis (uma vez) → dados chegam a view como `stores` e `plans`.

## Estados gerenciados

| Estado | Tipo | Descricao |
|--------|------|-----------|
| `stores` | `SuperStore[]` | Lista de lojas da pagina atual |
| `plans` | `SuperPlan[]` | Todos os planos disponiveis (para o seletor de troca) |
| `total` | `number` | Total de lojas encontradas (para exibicao e calculo de paginas) |
| `page` | `number` | Pagina atual da listagem |
| `perPage` | `number` | Itens por pagina (vem da API, padrao 20) |
| `search` | `string` | Texto de busca por nome ou slug da loja |
| `statusFilter` | `string` | Filtro por status: vazio (todas), `ACTIVE` ou `SUSPENDED` |
| `loading` | `boolean` | Indica carregamento inicial |
| `error` | `string \| null` | Mensagem de erro ao carregar lojas |
| `busyId` | `string \| null` | ID da loja com acao em andamento (desabilita botoes dela) |

## Acoes do usuario

| Acao | Handler | O que faz |
|------|---------|-----------|
| Digitar na busca | `setSearch` + `setPage(1)` | Filtra lojas por nome ou slug e volta para a primeira pagina |
| Selecionar filtro de status | `setStatusFilter` + `setPage(1)` | Filtra por ACTIVE/SUSPENDED e volta para a primeira pagina |
| Trocar plano no seletor | `handleChangePlan` | Pede confirmacao, chama `superService.updateStore` com novo `planId` e recarrega a lista |
| Clicar em suspender/reativar | `handleToggleStatus` | Pede confirmacao, alterna status entre ACTIVE e SUSPENDED via `superService.updateStore` |
| Navegar entre paginas | `setPage` | Muda a pagina da listagem |

## Modulos utilizados

- `@/modules/auth/hooks/useAdminAuth` — verifica autenticacao e flag `isSuperAdmin`
- `@/modules/super/services/super.service` — chamadas a API de super-admin (`listStores`, `listPlans`, `updateStore`)
- `@esqueleton/shared` — tipos `SuperStore` e `SuperPlan`

## Observacoes

- Acesso restrito a super-admins. Usuarios sem a flag sao redirecionados para `/admin/dashboard`.
- O seletor de plano exibe apenas planos ativos mais o plano atual da loja (mesmo que inativo).
- Acoes de suspender/reativar e troca de plano pedem confirmacao via `confirm()` antes de executar.
- O campo `busyId` impede cliques duplos enquanto uma acao esta em andamento.
