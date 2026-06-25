# QA — Meta Tags Open Graph

**Commits relacionados:** `bba0942`
**Data:** 2026-06-23

## Descrição

Meta tags OG dinâmicas para páginas de loja e produto. Quando compartilhado em redes sociais (WhatsApp, Instagram, Facebook), o link exibe preview com imagem, título e descrição da loja/produto.

## Casos de Teste

### CT-01: Meta tags da loja
1. Acessar `/loja/<slug>` e inspecionar `<head>`
2. **Esperado:** `og:title` = nome da loja, `og:description` = descrição, `og:image` = logo.

### CT-02: Meta tags do produto
1. Acessar `/loja/<slug>/produto/<id>` e inspecionar `<head>`
2. **Esperado:** `og:title` = nome do produto, `og:description` = descrição, `og:image` = imagem do produto.

### CT-03: Preview no WhatsApp
1. Compartilhar link de loja no WhatsApp
2. **Esperado:** Preview exibe título, descrição e imagem da loja.

### CT-04: Preview de produto no WhatsApp
1. Compartilhar link de produto no WhatsApp
2. **Esperado:** Preview exibe nome, descrição e foto do produto.

### CT-05: Loja sem logo
1. Compartilhar loja sem logo configurado
2. **Esperado:** Fallback adequado (sem imagem ou imagem padrão).

### CT-06: Produto sem imagem
1. Compartilhar produto sem imageUrl
2. **Esperado:** Fallback adequado.

## Critérios de Aceite

- [ ] Meta tags OG presentes em páginas de loja e produto
- [ ] Preview funciona no WhatsApp/Facebook
- [ ] Fallback para loja/produto sem imagem
