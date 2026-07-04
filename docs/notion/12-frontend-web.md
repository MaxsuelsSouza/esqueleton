# 12 — Frontend Web (Next.js)

[← Voltar ao início](00-inicio.md)

## Duas áreas, um app

| Área | Rota | Layout |
|------|------|--------|
| **Loja pública** | `/loja/[slug]/*` | Header público + contexts da loja |
| **Painel admin** | `/admin/*` | Sidebar (desktop) + nav mobile em carrossel, sem Header público |
| **Landing** | `/` | página de apresentação do SaaS → link para `/admin/login` |

## Camada de serviços

Toda chamada HTTP passa por `services/api-client.ts`, que prefixa com `NEXT_PUBLIC_API_URL/api`. Um service por feature (`catalog.service.ts`, `coupons.service.ts`, `billing.service.ts`, …), com a convenção:

- Funções **`Public`**-prefixadas recebem o **slug** (vindo de `useStoreSlug()`);
- Funções admin recebem o **token** e mandam `Authorization: Bearer <token>`.

## Autenticação no cliente

O login salva no `localStorage`: `admin_token`, `admin_store_slug`, `admin_store_name`, `admin_role`, `admin_email_verified`, `admin_is_super_admin`.

- `useAdminAuth()` verifica o token e lê role/emailVerified.
- OWNER vê itens extras de navegação (Equipe); super-admin vê a seção "Plataforma".
- **Importante:** esconder UI é conveniência — a autorização real é sempre server-side (ver [Autenticação](04-autenticacao-e-usuarios.md)).
- Banner amarelo de verificação de e-mail aparece enquanto `emailVerified` for falso.

## Subdomínio por loja

`meu-slug.plataforma.com` funciona via **middleware** (`src/middleware.ts`):

1. Intercepta cada request e extrai o subdomínio do header `Host`.
2. Faz `NextResponse.rewrite()` para `/loja/{slug}{pathname}` — rewrite **interno**, o usuário continua vendo a URL com subdomínio.
3. Toda a stack downstream (`useStoreSlug`, services, API) funciona sem mudanças, porque o path reescrito contém o segmento `[slug]`.

Configuração:

- `NEXT_PUBLIC_ROOT_DOMAIN` define o domínio raiz (ex.: `esqueleton.com.br`). Sem ela, o middleware tenta inferir.
- **Dev local:** use `NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000` e acesse `meu-slug.localhost:3000` (Chrome resolve `*.localhost` nativamente) — ou simplesmente use o path `/loja/{slug}`.
- **Subdomínios reservados** (não são lojas): `www`, `admin`, `api`, `app`, `mail`, `cdn`, `staging`, `dev`, `beta`, … (`SUBDOMAINS_RESERVADOS`).
- **Rotas ignoradas:** `/_next/*`, `/admin/*`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml` e paths que já começam com `/loja/`.
- **Produção (Vercel):** wildcard domain `*.plataforma.com` no projeto + CNAME `*.plataforma.com` no DNS.

## Páginas do admin

| Página | O quê |
|--------|-------|
| `/admin/login` | login + "Criar minha loja" (signup com sugestão de slug) |
| `/admin/produtos` | CRUD de produtos com upload de foto (galeria ou câmera) |
| `/admin/categorias` | árvore interativa de categorias |
| `/admin/promocoes` | promoções (tipo é rótulo; todos os campos disponíveis) |
| `/admin/cupons` | cupons com código, desconto, limite e validade |
| `/admin/usuarios` | equipe — convidar/remover (OWNER) |
| `/admin/plano` / `/admin/assinatura` | billing (OWNER) |
| `/admin/esqueci-senha`, `/admin/redefinir-senha`, `/admin/verificar-email` | fluxos de e-mail |
| `/admin/super/*` | plataforma (super-admin) |

## Transformações do catálogo público

Ordem aplicada em `loja/[slug]/page.tsx`: **promoções → cupom → filtros/ordenação** (detalhes em [Catálogo](05-catalogo.md) e [Precificação](06-precificacao.md)).

## Mocks

Flag `USE_MOCK_DATA` no topo das páginas de dados — todas `false` hoje. Mocks em `src/mocks/` (30 produtos de exemplo, categorias, promoções, cupons) para desenvolvimento sem API.

## Próxima página

→ [13 — Segurança](13-seguranca.md)
