# QA — Disponibilidade do Produto (isAvailable)

**Commits relacionados:** `b7bfed1`, `0e6640d`, `fad4528`
**Data:** 2026-06-23

## Descrição

Toggle `isAvailable` no produto permite ao admin ocultar produtos do catálogo público sem excluí-los. Produtos indisponíveis continuam visíveis no admin para gestão.

## Casos de Teste

### CT-01: Toggle na lista do admin
1. Acessar `/admin/produtos`
2. Clicar no toggle de disponibilidade de um produto
3. **Esperado:** Status alterna entre disponível/indisponível. Salvo imediatamente.

### CT-02: Produto indisponível no catálogo público
1. Marcar produto como indisponível (isAvailable = false)
2. Acessar catálogo público `/loja/<slug>`
3. **Esperado:** Produto NÃO aparece na listagem pública.

### CT-03: Produto indisponível no admin
1. Marcar produto como indisponível
2. Acessar `/admin/produtos`
3. **Esperado:** Produto APARECE na lista do admin (com indicação visual de indisponível).

### CT-04: Novo produto — padrão disponível
1. Criar novo produto sem definir isAvailable
2. **Esperado:** `isAvailable` padrão é `true`.

### CT-05: Acesso direto a produto indisponível
1. Acessar URL direta do produto indisponível (`/loja/<slug>/produto/<id>`)
2. **Esperado:** 404 ou página de erro (produto não encontrado no catálogo público).

## Critérios de Aceite

- [ ] Toggle funciona na lista do admin
- [ ] Produto indisponível não aparece no catálogo público
- [ ] Produto indisponível aparece no admin
- [ ] Padrão é disponível (true)
