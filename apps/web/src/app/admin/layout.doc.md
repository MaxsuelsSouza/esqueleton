# Admin Layout

Layout da area administrativa — barra lateral de navegacao, cabecalho mobile, banners de alerta e controle de acesso.

## Arquivo

| Arquivo | Responsabilidade |
|---------|-----------------|
| `layout.tsx` | Renderiza a estrutura do painel admin: sidebar (desktop), cabecalho com carrossel de navegacao (mobile), banners de verificacao de e-mail e assinatura, e o conteudo principal |

## O que este arquivo faz

Este e um Client Component (`'use client'`) que envolve todas as paginas sob `/admin/`. Ele gerencia:

### Deteccao de paginas publicas
As paginas `/admin/login`, `/admin/esqueci-senha`, `/admin/redefinir-senha` e `/admin/verificar-email` sao consideradas publicas (array `PUBLIC_PAGES`). Quando o usuario esta numa dessas paginas, o layout renderiza apenas o `children` sem sidebar, sem verificacao de token e sem banners — apenas um container basico com fundo cinza.

### Verificacao de autenticacao
Para paginas protegidas, usa o hook `useAdminAuth()` que verifica o token JWT no localStorage. Enquanto `isChecking` e `true`, exibe uma tela vazia. Apos a verificacao, monta a interface completa.

### Barra lateral (desktop — `lg:` e acima)
Uma `<aside>` fixa com 224px (`w-56`) contendo:
- Titulo "Administracao" com o sino de notificacoes (`NotificationBell`)
- Links de navegacao (`NAV_LINKS`): Dashboard, Produtos, Categorias, Destaques, Promocoes, Cupons, Notificacoes, Perfil, Plano
- Links de OWNER (`OWNER_LINKS`): Equipe — visivel apenas quando `isOwner` e `true`
- Secao "Plataforma" (`SUPER_LINKS`): Lojas, Planos, Usuarios, Metricas — visivel apenas para super-admins
- Link "Ver minha loja" — abre `/loja/<slug>` em nova aba (slug vem do localStorage)
- Botao "Sair" no rodape da barra

O link ativo e destacado com fundo escuro (`bg-gray-900 text-white`) comparando o `pathname` atual.

### Cabecalho mobile (abaixo de `lg:`)
Um `<header>` fixo no topo com:
- Titulo "Administracao", link para a loja, sino de notificacoes e botao de sair
- Carrossel horizontal de navegacao com todos os links (incluindo links de super-admin quando aplicavel)
- Animacao de encolhimento ao rolar a pagina (controlada pelo estado `scrolled`)

### Banners de alerta
Dois banners condicionais aparecem entre o cabecalho e o conteudo:
1. **EmailVerificationBanner** — banner amarelo que aparece quando `emailVerified` e `false`. Permite reenviar o e-mail de verificacao com um botao inline. Faz a chamada diretamente via `fetch` para `/api/auth/resend-verification`.
2. **SubscriptionBanner** — consulta `billingService.current()` a cada mudanca de rota (`pathname`). Mostra:
   - Banner laranja durante o periodo de teste ("faltam X dias")
   - Banner vermelho quando a loja esta fora do ar (trial expirado e sem assinatura ativa)
   - Nenhum banner se a assinatura esta ativa ou se o usuario ja esta na pagina `/admin/assinatura`

### Conteudo principal
O `children` e renderizado dentro de um `<main>` com padding responsivo. O componente `PendingOrdersPopup` aparece em todas as paginas do admin (popup de pedidos pendentes ha mais de 3 horas).

## Componentes e providers utilizados

- **`useAdminAuth`** (`@/modules/auth/hooks/useAdminAuth`) — hook que verifica autenticacao e retorna `isChecking`, `isOwner`, `isSuperAdmin`, `emailVerified` e `logout`.
- **`NotificationBell`** (`@/modules/notifications/components/NotificationBell`) — sino de notificacoes com badge.
- **`PendingOrdersPopup`** (`@/shared/components/PendingOrdersPopup`) — popup de alerta de pedidos pendentes.
- **`billingService`** (`@/modules/billing/services/billing.service`) — servico de billing usado pelo `SubscriptionBanner`.
- **`BillingCurrentResponse`** (`@esqueleton/shared`) — tipo da resposta de billing.
- **Icones Lucide** — `Package`, `Tag`, `BadgePercent`, `Ticket`, `Sparkles`, `LogOut`, `Store`, `LayoutDashboard`, `Bell`, `ExternalLink`, `Users`, `CreditCard`, `Building2`, `Layers`, `UserCog`, `BarChart3`.
- **`Link`** (next/link) e **`usePathname`** (next/navigation) — navegacao e deteccao de rota ativa.

## Observacoes

- O slug da loja e lido do `localStorage` (`admin_store_slug`) a cada mudanca de rota, pois nao existe durante a renderizacao no servidor.
- O `SubscriptionBanner` recarrega os dados de billing a cada navegacao para que o banner desapareca imediatamente apos o usuario assinar um plano.
- O carrossel mobile esconde a scrollbar via CSS (`[&::-webkit-scrollbar]:hidden`) e usa `-webkit-overflow-scrolling: touch` para rolagem suave em dispositivos moveis.
- O `EmailVerificationBanner` faz a chamada de reenvio diretamente via `fetch` em vez de usar um service dedicado.
- A lista de links de navegacao e montada dinamicamente: `NAV_LINKS` para todos, `OWNER_LINKS` adicionados para owners, `SUPER_LINKS` adicionados para super-admins.
