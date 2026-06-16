# CLAUDE.md — Frontend (apps/web)

Instruções para Claude Code ao trabalhar no frontend Next.js. Este arquivo complementa o `CLAUDE.md` da raiz do monorepo.

## Arquitetura do frontend

O frontend segue duas metodologias combinadas:

1. **CBD (Component-Based Development)** — organização por feature modules em `src/modules/`
2. **Container/Presenter (Smart vs Dumb)** — separação de lógica e view em cada página

### Estrutura de pastas

```
src/
├── app/                    # Rotas do Next.js (App Router) — NÃO reorganizar
│   ├── loja/[slug]/        # Páginas públicas da loja (catálogo, produto, sacola, favoritos)
│   └── admin/              # Páginas do painel admin (login, produtos, cupons, etc.)
│
├── modules/                # Feature modules CBD — cada feature é autônoma
│   ├── catalog/            # Exemplo de módulo completo
│   │   ├── index.ts        # Barrel — interface pública do módulo
│   │   ├── components/     # Componentes visuais do módulo
│   │   ├── services/       # Chamadas à API
│   │   ├── utils/          # Funções puras de lógica
│   │   └── mocks/          # Dados de exemplo para dev sem API
│   ├── auth/
│   │   ├── hooks/          # Hooks do módulo (useAdminAuth)
│   │   └── services/
│   ├── bag/
│   │   └── contexts/       # Context API do módulo
│   └── ...                 # (17 módulos no total)
│
└── shared/                 # Infraestrutura cross-module (usada por vários módulos)
    ├── components/         # Componentes reutilizáveis (RouteLoadingBar, PendingOrdersPopup)
    ├── layout/
    │   └── header/         # Header público e sub-componentes
    ├── hooks/              # Hooks genéricos (useStoreSlug)
    └── services/
        └── api-client.ts   # Cliente HTTP base — todos os módulos dependem dele
```

## Regras obrigatórias

### 1. Container/Presenter — toda página tem dois arquivos

Cada pasta de rota contém:

- **`page.hooks.ts`** — o "cérebro": todo `useState`, `useEffect`, `useCallback`, `useMemo`, chamadas a services, manipulação de dados. Exporta um hook `use<NomeDaPagina>Page()` que retorna um objeto com estados e handlers prontos.
- **`page.tsx`** — a "vitrine": importa o hook, desestrutura o retorno e renderiza JSX. Sem lógica de negócio, sem `useState` de página, sem `useEffect`, sem chamadas diretas a services.

**Exemplo real — esqueci-senha:**

```ts
// page.hooks.ts — lógica isolada
'use client'

import { useState } from 'react'
import { authService } from '@/modules/auth/services/auth.service'

export function useEsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await authService.forgotPassword(email.trim())
      setSent(true)
    } catch {
      setError('Erro ao enviar o e-mail. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return { email, setEmail, sent, isLoading, error, handleSubmit }
}
```

```tsx
// page.tsx — view pura
'use client'

import Link from 'next/link'
import { useEsqueciSenhaPage } from './page.hooks'

export default function ForgotPasswordPage() {
  const { email, setEmail, sent, isLoading, error, handleSubmit } = useEsqueciSenhaPage()

  // ...apenas JSX daqui para baixo
}
```

**Regras do hook:**
- Sempre começa com `'use client'`
- Nome: `use<NomeDaPagina>Page` (ex: `useProdutosPage`, `useSacolaPage`)
- Importa services, utils e contexts — nunca ícones ou componentes visuais
- Retorna um objeto plano com tudo que a view precisa
- Nunca gera JSX

**Regras da view:**
- Sempre começa com `'use client'`
- Importa apenas o hook, componentes visuais, ícones e tipos
- Desestrutura o retorno do hook na primeira linha do componente
- Se precisar de uma função com mais de 3 linhas de lógica, ela pertence ao hook
- Sub-componentes internos (modais, seletores) podem ter `useState` local de UI (ex: `expandedIds`, `search`, `copied`) — isso é estado de apresentação, não de negócio

### 2. CBD — todo código novo pertence a um módulo

Nunca crie arquivos soltos em `src/services/`, `src/utils/`, `src/hooks/`, `src/contexts/`, `src/components/` ou `src/mocks/`. Essas pastas foram removidas. Todo código pertence a:

- **`src/modules/<feature>/`** — se é específico de uma feature
- **`src/shared/`** — se é usado por vários módulos

### 3. Barrel exports (index.ts)

Todo módulo tem um `index.ts` que exporta apenas a interface pública:

```ts
// modules/catalog/index.ts
export { ProductCard } from './components/ProductCard'
export { ProductPrice } from './components/ProductPrice'
export { catalogService } from './services/catalog.service'
export { compressImage } from './utils/image'
```

- Mocks e testes NÃO são exportados no barrel (são internos)
- Outros módulos importam via barrel: `import { ProductCard } from '@/modules/catalog'`
- Dentro do próprio módulo, use caminhos relativos: `import { something } from './utils/thing'`

### 4. Import paths

- **Entre módulos:** use `@/modules/<feature>/...` ou `@/modules/<feature>` (barrel)
- **Shared:** use `@/shared/...`
- **Dentro do mesmo módulo:** use caminhos relativos (`./`, `../`)
- **Nunca use** os paths antigos: `@/services/`, `@/utils/`, `@/hooks/`, `@/contexts/`, `@/components/`, `@/mocks/`

## Módulos existentes

| Módulo | Conteúdo |
|--------|----------|
| `catalog` | ProductCard, ProductPrice, CatalogFilters, CatalogSearch, DisplayToggle, catalogService, image utils |
| `categories` | categoriesService, buildCategoryTree, flattenCategories, expandSelectedCategories |
| `promotions` | promotionsService, isPromotionActive, applyPromotionsToProducts |
| `coupons` | couponsService, validateCoupon, applyCouponToProduct, couponErrorMessage |
| `featured` | FeaturedSection, featuredService, isFeaturedActive, getActiveFeatured |
| `orders` | ordersService |
| `customers` | CustomerProvider, useCustomer, customersService |
| `bag` | BagProvider, useBag |
| `favorites` | FavoritesProvider, useFavorites |
| `store-profile` | StoreProfileProvider, useStoreProfile, storeProfileService |
| `auth` | useAdminAuth, authService |
| `users` | usersService |
| `billing` | billingService |
| `notifications` | NotificationBell, notificationsService |
| `analytics` | analyticsService |
| `session` | sessionService, getSessionToken |
| `super` | superService |

## Como criar uma feature nova

### Passo 1 — Criar o módulo

```
src/modules/avaliacoes/
├── index.ts                    # barrel
├── components/
│   └── StarRating.tsx          # componentes visuais
├── services/
│   └── avaliacoes.service.ts   # chamadas à API
├── utils/
│   └── avaliacoes.ts           # lógica pura (cálculos, formatação)
└── mocks/
    └── avaliacoes.ts           # dados de exemplo
```

### Passo 2 — Criar o barrel

```ts
// modules/avaliacoes/index.ts
export { StarRating } from './components/StarRating'
export { avaliacoesService } from './services/avaliacoes.service'
```

### Passo 3 — Criar a service

```ts
// modules/avaliacoes/services/avaliacoes.service.ts
import { apiClient } from '@/shared/services/api-client'

export const avaliacoesService = {
  async listPublic(slug: string) {
    return apiClient.get<Avaliacao[]>(`/lojas/${slug}/avaliacoes`)
  },
  async create(slug: string, data: NovaAvaliacao) {
    return apiClient.post(`/lojas/${slug}/avaliacoes`, data)
  },
}
```

### Passo 4 — Criar a página (Container/Presenter)

```ts
// app/admin/avaliacoes/page.hooks.ts
'use client'

import { useState, useEffect } from 'react'
import { avaliacoesService } from '@/modules/avaliacoes/services/avaliacoes.service'
import { useAdminAuth } from '@/modules/auth/hooks/useAdminAuth'

export function useAvaliacoesPage() {
  const { token } = useAdminAuth()
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    avaliacoesService.listAdmin(token)
      .then(setAvaliacoes)
      .finally(() => setIsLoading(false))
  }, [token])

  return { avaliacoes, isLoading }
}
```

```tsx
// app/admin/avaliacoes/page.tsx
'use client'

import { useAvaliacoesPage } from './page.hooks'

export default function AvaliacoesPage() {
  const { avaliacoes, isLoading } = useAvaliacoesPage()

  if (isLoading) return <div>Carregando...</div>

  return (
    <div>
      {avaliacoes.map((a) => (
        <div key={a.id}>{a.texto}</div>
      ))}
    </div>
  )
}
```

### Passo 5 — Registrar a rota no layout admin

Adicionar o link de navegação em `app/admin/layout.tsx`.

## Dependências entre módulos

```
shared/services/api-client  <── todos os modules/*/services/

store-profile  <── bag, favorites, header (tema da loja)
categories     <── catalog (filtros por categoria)
promotions     <── catalog (aplica descontos)
coupons        <── catalog, bag (aplica cupom)
featured       <── catalog (seção destaque)
session        <── bag, favorites (persistência Redis)
auth           <── todos os módulos admin (token JWT)
customers      <── orders (info do cliente no checkout)
```

**Dependência circular = erro de design.** Se dois módulos precisam se importar mutuamente, extraia o código compartilhado para `shared/` ou crie um terceiro módulo.

## Convenções de estilo

- **Tailwind CSS** para toda estilização — sem CSS modules, sem styled-components
- **Lucide React** para ícones — não instalar outros pacotes de ícones
- **CSS variables** para cor do tema da loja (definidas por `store-profile-context`)
- **Sem emojis** em código ou mensagens de erro, exceto se o usuário pedir
- **Mensagens de UI** em português (seguindo o CLAUDE.md raiz)
- **`'use client'`** obrigatório em todo arquivo que usa hooks React ou event handlers

## O que NÃO fazer

- Criar arquivos em `src/services/`, `src/utils/`, `src/hooks/`, `src/contexts/`, `src/components/`, `src/mocks/` — essas pastas não existem mais
- Colocar `useState`, `useEffect` ou chamadas a services diretamente no `page.tsx`
- Importar services ou utils na view — isso vai no hook
- Criar módulo sem `index.ts` barrel
- Importar via path relativo entre módulos diferentes — use `@/modules/` ou `@/shared/`
- Adicionar lógica de negócio em componentes visuais (components/) — lógica vai em utils/ ou no hook da página
