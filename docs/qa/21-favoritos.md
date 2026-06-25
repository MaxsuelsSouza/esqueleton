# QA — Produtos Favoritos

**Commits relacionados:** `6835de3`
**Data:** 2026-06-13

## Descrição

Clientes podem favoritar produtos para acesso rápido. Favoritos podem ser armazenados no Redis (Upstash) via sessão ou em localStorage como fallback.

## Casos de Teste

### CT-01: Favoritar produto
1. No catálogo, clicar no ícone de favorito de um produto
2. **Esperado:** Produto marcado como favorito. Ícone preenchido.

### CT-02: Desfavoritar produto
1. Clicar novamente no ícone de favorito
2. **Esperado:** Produto removido dos favoritos. Ícone vazio.

### CT-03: Página de favoritos
1. Acessar `/loja/<slug>/favoritos`
2. **Esperado:** Lista de produtos favoritados.

### CT-04: Favoritos vazios
1. Acessar página de favoritos sem nenhum item
2. **Esperado:** Mensagem "Nenhum favorito" ou similar.

### CT-05: Persistência no Redis
1. Com `REDIS_URL` configurado
2. Favoritar produto, fechar navegador, reabrir
3. **Esperado:** Favoritos persistem via sessão Redis.

### CT-06: Fallback para localStorage
1. Sem `REDIS_URL`
2. **Esperado:** Favoritos funcionam via localStorage.

### CT-07: Favoritos por loja
1. Favoritar produto na Loja A
2. Acessar Loja B
3. **Esperado:** Favoritos são independentes por loja/sessão.

## Critérios de Aceite

- [ ] Favoritar/desfavoritar funciona
- [ ] Página de favoritos lista corretamente
- [ ] Persistência (Redis ou localStorage) funciona
- [ ] Favoritos isolados por loja
