# QA — Seções em Destaque (Featured)

**Commits relacionados:** `3e70524`, `df1d8c5`
**Data:** 2026-06-13, 2026-06-14

## Descrição

Seções em destaque no topo do catálogo público. Suporta banner e modo carrossel com arraste touch/mouse. Apenas a primeira seção ativa (dentro do período e horário) é exibida. Admin gerencia via `/admin/promocoes` (mesmo painel).

## Casos de Teste

### CT-01: Criar destaque
1. No admin, criar seção em destaque com título, produtos e período
2. **Esperado:** Destaque criado com `active: true`.

### CT-02: Exibir destaque no catálogo
1. Acessar catálogo público
2. **Esperado:** Banner/carrossel de destaque no topo. `getActiveFeatured` seleciona o primeiro ativo.

### CT-03: Modo carrossel
1. Destaque com flag de carrossel ativada
2. **Esperado:** Produtos em carrossel horizontal. Arraste por touch e mouse funciona. Responsivo.

### CT-04: Nenhum destaque ativo
1. Nenhum destaque com `active: true` ou todos fora do período
2. **Esperado:** Seção de destaque oculta (banner não aparece).

### CT-05: Destaque com período (data/hora)
1. Criar destaque com horário (ex: 10h-18h)
2. Acessar fora do horário
3. **Esperado:** Destaque não aparece.

### CT-06: Múltiplos destaques ativos
1. Dois destaques com `active: true` e no período
2. **Esperado:** Apenas o PRIMEIRO é exibido (`getActiveFeatured` retorna o primeiro match).

### CT-07: Notificações persistem como lidas
1. Marcar notificação de destaque como lida
2. Recarregar página
3. **Esperado:** Notificação continua marcada como lida (fix `df1d8c5`).

### CT-08: Botões do destaque
1. Card de destaque com botão de ação
2. Clicar no card
3. **Esperado:** Card é clicável e navega para o produto/seção (fix `df1d8c5`).

### CT-09: API pública vs admin
1. `GET /api/lojas/:slug/featured` (público) — apenas `active: true`
2. `GET /api/featured` (admin) — todos da loja
3. **Esperado:** Filtragem correta.

## Critérios de Aceite

- [ ] Carrossel funciona com touch e mouse
- [ ] Apenas primeiro destaque ativo é exibido
- [ ] Período e horário respeitados
- [ ] Banner oculto quando nenhum destaque ativo
- [ ] Cards clicáveis
- [ ] Responsivo
