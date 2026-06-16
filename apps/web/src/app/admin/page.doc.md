# Admin Root Redirect

Redirecionamento da raiz `/admin` para `/admin/dashboard`.

## Arquivo

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Redireciona automaticamente o usuario de `/admin` para `/admin/dashboard` |

## O que este arquivo faz

Este arquivo contem um unico componente servidor que chama `redirect('/admin/dashboard')` do Next.js. Quando o usuario acessa `/admin` diretamente, ele e imediatamente redirecionado para o dashboard.

O redirecionamento acontece no servidor (Server Component) usando a funcao `redirect` de `next/navigation`, que emite um HTTP 307 (Temporary Redirect).

## Componentes e providers utilizados

- **`redirect`** (`next/navigation`) — funcao do Next.js que interrompe a renderizacao e redireciona o usuario.

## Observacoes

- Este e um Server Component (sem `'use client'`), entao o redirecionamento acontece antes de qualquer JavaScript chegar ao navegador.
- A autenticacao nao e verificada aqui — o layout pai (`/admin/layout.tsx`) cuida disso. Se o usuario nao estiver autenticado, o hook `useAdminAuth` no layout ja trata o redirecionamento para o login.
- O destino do redirect e `/admin/dashboard`, que e a pagina principal do painel administrativo.
