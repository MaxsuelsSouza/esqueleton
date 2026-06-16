# Layout da Loja Publica

Layout do site publico de uma loja — monta os contextos de dados e exibe o cabecalho.

## Arquivo

| Arquivo | Responsabilidade |
|---------|-----------------|
| `layout.tsx` | Envolve todas as paginas publicas da loja (`/loja/[slug]/...`) com providers de contexto e renderiza o cabecalho |

## O que este arquivo faz

Este e um Server Component que define a estrutura compartilhada por todas as paginas publicas de uma loja (catalogo, detalhe do produto, sacola, favoritos). Ele faz duas coisas:

1. **Aninha quatro Context Providers** na seguinte ordem (de fora para dentro):
   - `StoreProfileProvider` — carrega e disponibiliza o perfil da loja (nome, logo, cores do tema, WhatsApp) a partir do slug na URL. Define as CSS variables de cor usadas por toda a interface publica.
   - `CustomerProvider` — gerencia a identificacao do cliente (nome, telefone) para o checkout via WhatsApp.
   - `FavoritesProvider` — gerencia a lista de produtos favoritados pelo visitante (persistida via sessao).
   - `BagProvider` — gerencia a sacola de compras do visitante (itens, quantidades, persistida via sessao).

2. **Renderiza o cabecalho** com dois componentes:
   - `AnnouncementBar` — barra de anuncios no topo (configuravel pelo lojista no perfil da loja).
   - `HeaderWithProfile` — cabecalho principal com logo, nome da loja, campo de busca, icones de favoritos e sacola com contadores.

O `children` (conteudo da pagina especifica) e renderizado dentro de todos os providers, apos o cabecalho.

## Componentes e providers utilizados

- **`StoreProfileProvider`** (`@/modules/store-profile/contexts/store-profile-context`) — contexto que carrega o perfil da loja pelo slug da URL e define o tema visual.
- **`CustomerProvider`** (`@/modules/customers/contexts/customer-context`) — contexto que gerencia dados do cliente para checkout.
- **`FavoritesProvider`** (`@/modules/favorites/contexts/favorites-context`) — contexto que gerencia a lista de favoritos.
- **`BagProvider`** (`@/modules/bag/contexts/bag-context`) — contexto que gerencia a sacola de compras.
- **`HeaderWithProfile`** (`@/shared/layout/header/HeaderWithProfile`) — cabecalho da loja publica que consome o `StoreProfileProvider`.
- **`AnnouncementBar`** (`@/shared/layout/header/AnnouncementBar`) — barra de anuncios configuravel acima do cabecalho.

## Observacoes

- A ordem dos providers importa: `StoreProfileProvider` precisa ser o mais externo porque os demais dependem do perfil da loja (especialmente o slug e o tema de cores).
- O slug da loja vem do parametro dinamico `[slug]` na URL, mas nao e passado explicitamente — os providers internos usam o hook `useStoreSlug()` para le-lo da rota.
- Este layout nao inclui rodape — cada pagina publica e responsavel por seu proprio conteudo abaixo do cabecalho.
- Quando a loja esta indisponivel (trial expirado e sem assinatura), o `StoreProfileProvider` recebe um erro da API e exibe uma tela de erro generica, impedindo o acesso ao catalogo.
