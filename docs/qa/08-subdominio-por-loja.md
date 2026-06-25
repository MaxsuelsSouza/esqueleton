# QA — Subdomínio por Loja

**Commits relacionados:** `b421e4c`, `690a16e`
**Data:** 2026-06-23

## Descrição

Lojas podem ser acessadas via subdomínio (`meu-slug.plataforma.com`) em vez de path (`plataforma.com/loja/meu-slug`). O middleware Next.js faz rewrite interno para `/loja/{slug}{pathname}`.

## Pré-condições

- `NEXT_PUBLIC_ROOT_DOMAIN` configurado
- Em dev local: usar `NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000` e acessar `meu-slug.localhost:3000` (Chrome resolve `*.localhost`)

## Casos de Teste

### CT-01: Acesso via subdomínio
1. Acessar `minha-loja.plataforma.com`
2. **Esperado:** Catálogo da loja com slug `minha-loja` exibido. URL mantém o subdomínio (rewrite interno).

### CT-02: Acesso via path (fallback)
1. Acessar `plataforma.com/loja/minha-loja`
2. **Esperado:** Mesmo catálogo. Path continua funcionando.

### CT-03: Subdomínio reservado
1. Acessar `www.plataforma.com`, `admin.plataforma.com`, `api.plataforma.com`
2. **Esperado:** Não trata como loja. Comportamento padrão da aplicação.

### CT-04: Subdomínio inexistente
1. Acessar `loja-inexistente.plataforma.com`
2. **Esperado:** 404 ou página de erro "Loja não encontrada".

### CT-05: Rotas ignoradas pelo middleware
1. Acessar `minha-loja.plataforma.com/_next/...` ou `minha-loja.plataforma.com/admin/...`
2. **Esperado:** Middleware não reescreve. Rotas admin e assets funcionam normalmente.

### CT-06: Navegação interna via subdomínio
1. Acessar `minha-loja.plataforma.com`
2. Clicar em um produto
3. **Esperado:** URL continua com subdomínio (ex: `minha-loja.plataforma.com/produto/123`).

## Subdomínios Reservados

`www`, `admin`, `api`, `app`, `mail`, `cdn`, `staging`, `dev`, `beta` (e outros definidos em `SUBDOMAINS_RESERVADOS` no middleware).

## Rotas Ignoradas pelo Middleware

- `/_next/*`
- `/admin/*`
- `/favicon.ico`
- `/robots.txt`
- `/sitemap.xml`
- URLs que já começam com `/loja/`

## Critérios de Aceite

- [ ] Subdomínio resolve para a loja correta
- [ ] Path `/loja/{slug}` continua funcionando
- [ ] Subdomínios reservados não são tratados como loja
- [ ] Rotas admin/assets não são afetadas pelo middleware
- [ ] Navegação interna mantém o subdomínio
