# QA — Checklist de Onboarding

**Commits relacionados:** `fa70e1f`
**Data:** 2026-06-23

## Descrição

Dashboard do admin exibe um checklist de onboarding para guiar o dono da loja nos primeiros passos: completar perfil, adicionar produtos, configurar categorias, etc.

## Casos de Teste

### CT-01: Exibir checklist
1. Logar como admin de loja recém-criada
2. Acessar dashboard
3. **Esperado:** Checklist de onboarding visível com itens pendentes.

### CT-02: Item completado automaticamente
1. Completar perfil da loja (adicionar WhatsApp, logo)
2. Recarregar dashboard
3. **Esperado:** Item "Completar perfil" marcado como concluído.

### CT-03: Adicionar primeiro produto
1. Criar o primeiro produto da loja
2. **Esperado:** Item "Adicionar produto" marcado como concluído.

### CT-04: Todos os itens completados
1. Completar todos os passos do checklist
2. **Esperado:** Checklist indica 100% concluído (ou é ocultado).

### CT-05: Checklist persistente
1. Completar alguns itens, sair e voltar
2. **Esperado:** Progresso mantido (baseado nos dados reais da loja).

## Critérios de Aceite

- [ ] Checklist aparece para lojas novas
- [ ] Itens completados automaticamente conforme dados
- [ ] Progresso persiste entre sessões
