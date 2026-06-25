# QA — Promoções

**Commits relacionados:** `ebd8824`, `5e823db`, `5981d62`
**Data:** 2026-06-09, 2026-06-15

## Descrição

Sistema de promoções flexível: tipo é apenas um rótulo (desconto, kit, compre X leve Y, horário), todos os campos são sempre disponíveis. Promoções ativas aplicam desconto automático no catálogo público. Preço original aparece riscado com tag de desconto (%).

## Pré-condições

- Produtos cadastrados
- Logado como admin para gestão

## Casos de Teste

### CT-01: Criar promoção
1. Acessar `/admin/promocoes`
2. Clicar em "Nova promoção"
3. Preencher: nome, tipo, desconto, produtos, período
4. **Esperado:** Promoção criada com `active: true`.

### CT-02: Promoção com período (data início/fim)
1. Criar promoção com data início = amanhã
2. **Esperado:** Promoção existe mas `isPromotionActive` retorna false (não começou).
3. Alterar data início para ontem
4. **Esperado:** Promoção ativa.

### CT-03: Promoção com horário
1. Criar promoção com horário (ex: 18h-22h)
2. Acessar catálogo dentro do horário
3. **Esperado:** Desconto aplicado.
4. Acessar fora do horário
5. **Esperado:** Preço normal.

### CT-04: Preço original riscado no catálogo
1. Produto com promoção ativa de 20%
2. Acessar catálogo público
3. **Esperado:** Preço original riscado, novo preço exibido, tag "-20%".

### CT-05: Preço promocional no carrinho
1. Adicionar produto com promoção na sacola
2. **Esperado:** Sacola exibe preço promocional. Resumo mostra economia.

### CT-06: Desativar promoção
1. Marcar promoção como `active: false`
2. **Esperado:** Desconto removido do catálogo público imediatamente.

### CT-07: API pública vs admin
1. `GET /api/lojas/:slug/promotions` (público)
2. **Esperado:** Retorna apenas promoções com `active: true`.
3. `GET /api/promotions` (admin, JWT)
4. **Esperado:** Retorna todas as promoções da loja.

### CT-08: Múltiplas promoções no mesmo produto
1. Produto com 2 promoções ativas
2. **Esperado:** Comportamento definido (última promoção prevalece ou acumula — verificar implementação).

## Funções de Utilidade

| Função | Arquivo | Descrição |
|--------|---------|-----------|
| `isPromotionActive` | `utils/promotions.ts` | Verifica se promoção está ativa (data + horário) |
| `applyPromotionsToProducts` | `utils/promotions.ts` | Aplica descontos em lista de produtos |

## Critérios de Aceite

- [ ] CRUD de promoções funciona
- [ ] Promoções com período respeitam datas
- [ ] Promoções com horário respeitam horário
- [ ] Preço original riscado no catálogo
- [ ] Preço promocional na sacola
- [ ] API pública retorna apenas ativas
