# Root Layout

Layout raiz da aplicacao Next.js — define a estrutura HTML base para todas as paginas.

## Arquivo

| Arquivo | Responsabilidade |
|---------|-----------------|
| `layout.tsx` | Envolve toda a aplicacao com `<html>` e `<body>`, define metadata global e inclui a barra de carregamento de rotas |

## O que este arquivo faz

Este e o layout raiz do App Router do Next.js. Toda pagina da aplicacao (publica e admin) e renderizada dentro dele. Suas responsabilidades sao:

1. **Estrutura HTML** — define `<html lang="pt-BR">` e `<body>`, garantindo o idioma correto para acessibilidade e SEO.
2. **Metadata global** — exporta um objeto `metadata` do tipo `Metadata` com:
   - `title`: "Esqueleton — Catalogo online gratis para sua loja"
   - `description`: texto de apresentacao para mecanismos de busca
   - `openGraph`: tags Open Graph para compartilhamento em redes sociais (imagem OG comentada, aguardando asset real)
   - `twitter`: card do Twitter com titulo e descricao
3. **Barra de carregamento** — renderiza `RouteLoadingBar` dentro de um `Suspense` (fallback `null`), que mostra uma barra de progresso no topo durante navegacoes entre paginas.
4. **CSS global** — importa `./globals.css` que contem os estilos globais (incluindo `overflow-x: hidden` no body).

## Componentes e providers utilizados

- **`Suspense`** (React) — envolve a barra de carregamento para permitir renderizacao assincrona.
- **`RouteLoadingBar`** (`@/shared/components/RouteLoadingBar`) — componente client-side que exibe uma barra de progresso durante transicoes de rota.
- **`./globals.css`** — estilos globais do Tailwind e customizacoes.

## Observacoes

- Este layout e intencionalmente minimalista. Nao inclui cabecalho, rodape, sidebar ou contextos — esses elementos vivem nos layouts filhos (`/loja/[slug]/layout.tsx` para o site publico e `/admin/layout.tsx` para o painel admin).
- A imagem Open Graph esta comentada no codigo, aguardando um asset real (print de celular com a vitrine).
- O `lang="pt-BR"` no `<html>` e importante para leitores de tela e indexacao por motores de busca.
