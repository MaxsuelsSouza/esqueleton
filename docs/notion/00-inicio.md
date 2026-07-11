# Esqueleton — Documentação

Bem-vindo à documentação completa do **Esqueleton**, a plataforma SaaS multi-tenant de catálogos e vitrines online.

Esta wiki explica **como o sistema funciona de ponta a ponta**: da arquitetura ao deploy, passando por cada feature. Cada página é independente, mas elas se conectam por links.

---

## 🗺️ Comece por aqui

| Página | O que você vai encontrar |
|--------|--------------------------|
| [01 — Visão Geral](01-visao-geral.md) | O que é o sistema, quem usa e os fluxos principais |
| [02 — Arquitetura](02-arquitetura.md) | Monorepo, camadas da API, fluxo de dados |
| [03 — Multi-tenancy](03-multi-tenancy.md) | Como as lojas são isoladas (o coração do sistema) |

## 🔐 Identidade e acesso

| Página | O que você vai encontrar |
|--------|--------------------------|
| [04 — Autenticação e Usuários](04-autenticacao-e-usuarios.md) | Cadastro, login, JWT, roles OWNER/STAFF, reset de senha, verificação de e-mail |
| [09 — Super Admin](09-super-admin.md) | Painel da plataforma: lojas, planos, usuários, métricas |
| [13 — Segurança](13-seguranca.md) | Rate limiting, validações, riscos aceitos e por quê |

## 🛍️ Features da loja

| Página | O que você vai encontrar |
|--------|--------------------------|
| [05 — Catálogo](05-catalogo.md) | Produtos, categorias em árvore, catálogo público |
| [06 — Precificação](06-precificacao.md) | Promoções, cupons e seções em destaque |
| [07 — Pedidos](07-pedidos.md) | Sacola, checkout via WhatsApp e validação de preços no servidor |
| [11 — Catálogo WhatsApp (Meta)](11-whatsapp-catalog.md) | Sincronização de produtos com o WhatsApp Business |

## 💰 Negócio

| Página | O que você vai encontrar |
|--------|--------------------------|
| [08 — Billing e Assinaturas](08-billing.md) | Trial de 7 dias, planos, limites, Stripe, webhook |

## 🖥️ Frontend e infraestrutura

| Página | O que você vai encontrar |
|--------|--------------------------|
| [10 — Imagens (Cloudflare R2)](10-imagens-r2.md) | Upload, storage e migração de imagens |
| [12 — Frontend Web](12-frontend-web.md) | Loja pública, painel admin, subdomínios por loja |
| [14 — Deploy e Ambientes](14-deploy-e-ambientes.md) | Variáveis de ambiente, perfis de banco, Vercel/VPS |

---

## Resumo em 5 linhas

1. **Uma API, um banco, várias lojas** — cada loja (tenant) é um `Store` com `slug` único; todo dado carrega `storeId` e um *tenant guard* impede vazamento entre lojas.
2. **Painel admin** em `/admin` (JWT) e **catálogo público** em `/loja/{slug}` ou `{slug}.plataforma.com`.
3. **"Pagou, usou"** — 7 dias de trial; depois, catálogo público só com assinatura ativa (Stripe).
4. **Checkout via WhatsApp** — o cliente monta a sacola no site e envia o pedido pela conversa.
5. **Stack:** Fastify + Prisma + PostgreSQL na API; Next.js 14 + Tailwind no web; pnpm workspaces no monorepo.
