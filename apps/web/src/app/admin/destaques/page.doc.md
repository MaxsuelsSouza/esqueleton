# Destaques

Pagina de gestao de secoes em destaque no catalogo, com CRUD e ativacao exclusiva (apenas uma secao ativa por vez).

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza a lista de secoes de destaque como cards (titulo, tag, status, badge de carrossel, produtos, restricoes de tempo e acoes). Contem o modal de formulario com campos de titulo, tag, selecao de produtos com busca, restricao de horario, periodo, toggle de carrossel e toggle ativo. Sub-componentes: Toggle, StatusBadge, Modal. |
| `page.hooks.ts` | Carrega secoes de destaque e produtos da API. Gerencia abertura de modais, validacao (titulo e pelo menos um produto), envio do formulario, exclusao e ativacao exclusiva. Exporta funcoes utilitarias `computeStatus` e `formatDate`. |

## Fluxo de dados

1. `useDestaquesPage()` chama em paralelo: `featuredService.listFeatured` e `catalogService.listProductOptions`.
2. A secao atualmente ativa e calculada com `useMemo` verificando `active === true` e se esta dentro da janela de horario/periodo (`isWithinSchedule`).
3. Ao salvar, o hook monta o payload com titulo, tag, productIds, restricoes de tempo e chama `featuredService.createFeatured` ou `updateFeatured`.
4. Ao ativar/desativar, chama `featuredService.updateFeatured` — a API garante que apenas uma secao fica ativa por vez.

## Estados gerenciados

| Estado | Tipo | Descricao |
|--------|------|-----------|
| `sections` | `Featured[]` | Lista de secoes de destaque |
| `products` | `ProductOption[]` | Lista de produtos para selecao |
| `modalOpen` | `boolean` | Modal de criar/editar aberto |
| `editingSection` | `Featured \| null` | Secao sendo editada |
| `form` | `FeaturedFormData` | Dados do formulario (titulo, tag, productIds, datas, horarios, active, carousel) |
| `formError` | `string \| null` | Erro de validacao |
| `isSaving` | `boolean` | Salvamento em andamento |
| `hasTimeWindow` | `boolean` | Toggle de restricao de horario |
| `hasDateRange` | `boolean` | Toggle de periodo |
| `deletingSection` | `Featured \| null` | Secao selecionada para exclusao |
| `isDeleting` | `boolean` | Exclusao em andamento |
| `productSearch` | `string` | Texto de busca no seletor de produtos |
| `activeSection` | `Featured \| null` | Secao ativa no momento (calculada com useMemo) |
| `filteredProducts` | `ProductOption[]` | Produtos filtrados pela busca (calculado com useMemo) |

## Acoes do usuario

| Acao | Handler | O que faz |
|------|---------|-----------|
| Clicar "Novo destaque" | `openCreateModal` | Abre modal com formulario vazio |
| Clicar editar | `openEditModal` | Abre modal preenchido com dados da secao |
| Salvar destaque | `handleSave` | Valida titulo e produtos, monta payload e chama create/update |
| Excluir destaque | `handleDelete` | Remove a secao da API |
| Toggle ativo/inativo | `handleActivate` | Ativa a secao (desativando as demais automaticamente) ou desativa |
| Marcar/desmarcar produto | `toggleProduct` | Adiciona ou remove produto da lista de selecionados |

## Modulos utilizados

- `@/modules/featured/services/featured.service` — CRUD de secoes de destaque
- `@/modules/catalog/services/catalog.service` — `listProductOptions` para o seletor de produtos
- Mocks de featured e catalog (quando `USE_MOCK_DATA = true`)

## Observacoes

- A flag `USE_MOCK_DATA` esta `false`.
- Apenas uma secao pode estar ativa por vez — ativar uma desativa as demais automaticamente.
- O status pode ser: Ativo, Inativo, Agendado, Encerrado ou Fora do horario.
- O toggle "Exibir como carrossel" faz os produtos passarem automaticamente, 4 por vez.
- A tag e um badge visual exibido no canto do banner de destaque no catalogo publico.
