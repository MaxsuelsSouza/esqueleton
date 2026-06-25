# QA — Características do Produto

**Commits relacionados:** `ab0a04a`
**Data:** 2026-06-15

## Descrição

Produtos têm uma lista de características (pares nome/valor) exibidas no detalhe do produto e editáveis no modal admin. Ex: "Volume: 100ml", "Tipo: Eau de Parfum".

## Casos de Teste

### CT-01: Adicionar características no admin
1. Editar produto
2. Adicionar características: nome e valor
3. Salvar
4. **Esperado:** Características salvas (JSON). Exibidas na lista de características.

### CT-02: Exibir no detalhe público
1. Acessar detalhe de produto com características
2. **Esperado:** Seção de características com pares nome/valor formatados.

### CT-03: Editar características existentes
1. Alterar valor de uma característica
2. Salvar
3. **Esperado:** Valor atualizado.

### CT-04: Remover característica
1. Remover uma característica da lista
2. Salvar
3. **Esperado:** Característica removida.

### CT-05: Produto sem características
1. Acessar detalhe de produto sem características
2. **Esperado:** Seção de características não exibida (ou vazia).

## Critérios de Aceite

- [ ] CRUD de características no admin
- [ ] Exibição no detalhe público
- [ ] Funciona com zero características
