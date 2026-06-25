# QA — Landing Page

**Commits relacionados:** `5c17100`
**Data:** 2026-06-12

## Descrição

Página de apresentação do SaaS em `/` (raiz). Copy focada em conversão com link para `/admin/login` (criar loja ou entrar). Não é uma página de loja — é a vitrine da plataforma.

## Casos de Teste

### CT-01: Acesso à landing page
1. Acessar `http://localhost:3000/`
2. **Esperado:** Página de apresentação da plataforma. Copy sobre catálogos/lojas online.

### CT-02: CTA principal
1. Clicar no botão principal (ex: "Criar minha loja grátis")
2. **Esperado:** Redireciona para `/admin/login`.

### CT-03: Responsividade
1. Visualizar em mobile (320px, 375px)
2. **Esperado:** Layout adaptado. Sem overflow. Textos legíveis.

### CT-04: Não confundir com loja
1. Acessar `/`
2. **Esperado:** Não exibe catálogo de nenhuma loja. É a apresentação da plataforma.

### CT-05: SEO básico
1. Inspecionar `<head>`
2. **Esperado:** Title, description e meta tags presentes.

## Critérios de Aceite

- [ ] Landing page acessível em `/`
- [ ] CTA redireciona para login/signup
- [ ] Responsiva
- [ ] Não confunde com página de loja
