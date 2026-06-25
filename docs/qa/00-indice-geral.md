# Documentação de QA — Índice Geral

Este diretório contém guias de teste para cada feature do sistema Esqueleton (plataforma SaaS de catálogos de lojas).

## Features por Área

### Autenticação e Segurança
| # | Arquivo | Feature |
|---|---------|---------|
| 01 | [01-autenticacao-login.md](01-autenticacao-login.md) | Login e registro de usuários |
| 02 | [02-reset-de-senha.md](02-reset-de-senha.md) | Esqueci minha senha / Redefinir senha |
| 03 | [03-verificacao-de-email.md](03-verificacao-de-email.md) | Verificação de e-mail obrigatória |
| 04 | [04-roles-owner-staff.md](04-roles-owner-staff.md) | Papéis OWNER e STAFF |
| 05 | [05-rate-limiting.md](05-rate-limiting.md) | Rate limiting e proteção contra brute force |

### Multi-tenancy e Lojas
| # | Arquivo | Feature |
|---|---------|---------|
| 06 | [06-multi-tenancy.md](06-multi-tenancy.md) | Isolamento multi-tenant (storeId) |
| 07 | [07-perfil-da-loja.md](07-perfil-da-loja.md) | Perfil da loja (logo, WhatsApp, cores) |
| 08 | [08-subdominio-por-loja.md](08-subdominio-por-loja.md) | Acesso via subdomínio |
| 09 | [09-disponibilidade-da-loja.md](09-disponibilidade-da-loja.md) | Loja disponível apenas com assinatura ativa |

### Catálogo de Produtos
| # | Arquivo | Feature |
|---|---------|---------|
| 10 | [10-produtos-crud.md](10-produtos-crud.md) | CRUD de produtos (admin) |
| 11 | [11-categorias.md](11-categorias.md) | Árvore de categorias |
| 12 | [12-catalogo-publico.md](12-catalogo-publico.md) | Catálogo público (filtros, busca, ordenação) |
| 13 | [13-disponibilidade-produto.md](13-disponibilidade-produto.md) | Toggle isAvailable (ocultar produto) |
| 14 | [14-caracteristicas-produto.md](14-caracteristicas-produto.md) | Características do produto (nome/valor) |

### Promoções e Cupons
| # | Arquivo | Feature |
|---|---------|---------|
| 15 | [15-promocoes.md](15-promocoes.md) | Promoções (desconto, horário, período) |
| 16 | [16-cupons.md](16-cupons.md) | Cupons de desconto com código |
| 17 | [17-destaques.md](17-destaques.md) | Seções em destaque (banner + carrossel) |

### Pedidos e Sacola
| # | Arquivo | Feature |
|---|---------|---------|
| 18 | [18-sacola.md](18-sacola.md) | Sacola de compras |
| 19 | [19-pedidos.md](19-pedidos.md) | Criação e gestão de pedidos |
| 20 | [20-validacao-preco-servidor.md](20-validacao-preco-servidor.md) | Validação de preço no servidor |
| 21 | [21-favoritos.md](21-favoritos.md) | Produtos favoritos |

### Billing e Planos
| # | Arquivo | Feature |
|---|---------|---------|
| 22 | [22-planos-e-assinatura.md](22-planos-e-assinatura.md) | Planos, limites e assinatura (MercadoPago) |
| 23 | [23-trial-7-dias.md](23-trial-7-dias.md) | Trial de 7 dias |

### Super Admin
| # | Arquivo | Feature |
|---|---------|---------|
| 24 | [24-super-admin.md](24-super-admin.md) | Painel super-admin (lojas, planos, métricas) |

### Analytics e UX
| # | Arquivo | Feature |
|---|---------|---------|
| 25 | [25-analytics.md](25-analytics.md) | Analytics e ranking de produtos |
| 26 | [26-onboarding-checklist.md](26-onboarding-checklist.md) | Checklist de onboarding do admin |
| 27 | [27-meta-tags-og.md](27-meta-tags-og.md) | Meta tags Open Graph dinâmicas |
| 28 | [28-ux-geral.md](28-ux-geral.md) | UX geral (loading, cache, sugestões, autocomplete) |
| 29 | [29-sessao-redis.md](29-sessao-redis.md) | Sacola e favoritos no Redis |
| 30 | [30-landing-page.md](30-landing-page.md) | Landing page de apresentação |

---

**Ambiente de teste:**
- API: `http://localhost:3001`
- Web: `http://localhost:3000`
- Banco: PostgreSQL local via Docker
- Comandos: `pnpm dev` (tudo), `pnpm test` (testes automatizados)
