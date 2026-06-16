# Super Admin - Planos da Plataforma

Pagina de CRUD de planos do SaaS, onde o super-admin define nome, slug, limites, preco e periodo de cobranca.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza a lista de planos, formulario de criacao/edicao inline e botoes de editar/desativar. |
| `page.hooks.ts` | Gerencia estado da listagem e do formulario (criacao e edicao), validacoes locais, e expoe handlers para salvar e desativar planos via `superService`. Exporta tambem `formatPrice` para formatar centavos em reais. |

## Fluxo de dados

`useAdminAuth()` verifica token e `isSuperAdmin` → redireciona se nao for super-admin → `superService.listPlans(token)` carrega todos os planos → ao salvar, `superService.createPlan` ou `superService.updatePlan` envia para a API → ao desativar, `superService.deletePlan` marca como inativo → lista e recarregada apos cada acao.

## Estados gerenciados

| Estado | Tipo | Descricao |
|--------|------|-----------|
| `plans` | `SuperPlan[]` | Todos os planos da plataforma |
| `loading` | `boolean` | Carregamento inicial |
| `error` | `string \| null` | Erro ao carregar planos |
| `showForm` | `boolean` | Controla visibilidade do formulario |
| `editingPlan` | `SuperPlan \| null` | Plano sendo editado (null = criando novo) |
| `formData` | `PlanFormData` | Campos do formulario (name, slug, limites, preco em reais, periodo, sortOrder, active) |
| `formError` | `string \| null` | Erro de validacao ou da API no formulario |
| `saving` | `boolean` | Indica que o formulario esta sendo salvo |
| `deletingId` | `string \| null` | ID do plano sendo desativado |

## Acoes do usuario

| Acao | Handler | O que faz |
|------|---------|-----------|
| Clicar "Novo plano" | `openCreateForm` | Abre o formulario limpo para criar um plano |
| Clicar no icone de editar | `openEditForm` | Abre o formulario pre-preenchido com os dados do plano |
| Submeter o formulario | `handleSave` | Valida campos, converte preco de reais para centavos, chama create ou update e recarrega a lista |
| Clicar no icone de desativar | `handleDeactivate` | Pede confirmacao, chama `superService.deletePlan` e recarrega a lista |
| Fechar formulario (X) | `setShowForm(false)` | Esconde o formulario sem salvar |

## Modulos utilizados

- `@/modules/auth/hooks/useAdminAuth` — verifica autenticacao e flag `isSuperAdmin`
- `@/modules/super/services/super.service` — chamadas a API (`listPlans`, `createPlan`, `updatePlan`, `deletePlan`)
- `@esqueleton/shared` — tipos `SuperPlan` e `PlanInput`

## Observacoes

- Acesso restrito a super-admins.
- O preco e informado em reais no formulario e convertido para centavos (`Math.round(preco * 100)`) ao salvar.
- Campos de limite vazios significam "ilimitado" (enviados como `null`).
- O botao de desativar so aparece em planos ativos. A API bloqueia desativacao se existirem assinaturas ativas no plano.
- Planos inativos exibem uma tag "Inativo" na lista.
- A funcao `formatPrice` e exportada e usada para exibir precos em formato `R$ XX,XX`.
