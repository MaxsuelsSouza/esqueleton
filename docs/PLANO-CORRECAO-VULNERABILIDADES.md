# Plano de Correção de Vulnerabilidades (CVE)

> **Data da análise:** 01/07/2026
> **Fonte:** base oficial de CVEs (`cvelistV5/`, anos 2024–2026) cruzada com as versões **exatas instaladas** no `pnpm-lock.yaml`.
> **Escopo:** monorepo esqueleton-project — API (Fastify) e Web (Next.js).

---

## 1. Resumo executivo

| Situação | Quantidade |
|----------|-----------|
| Vulnerabilidades **ativas** que afetam a versão instalada | **11** (10 no Next.js, 1 no Fastify) |
| Vulnerabilidades já corrigidas pela versão instalada | 15+ |
| Falsos positivos descartados (produtos homônimos) | 3 |

**As duas causas-raiz são as mesmas: fim de vida (EOL) das versões maiores em uso.**

1. **Next.js 14.x é EOL.** A leva de CVEs publicada entre dez/2025 e 2026 (série CVE-2026-445xx e outros) só recebeu correção nas linhas **15.5.16+** e **16.x**. Não existe patch para nenhuma versão 14.x — a única correção real é **migrar para Next.js 15.5.16 ou superior**.
2. **Fastify 4.x é EOL** (fim do suporte de segurança em jun/2025). CVE-2026-3635 afeta explicitamente todas as versões até 5.8.2 (incluindo a 4.29.1 instalada) e os bypasses de validação de Content-Type (CVE-2026-25223, CVE-2026-3419, CVE-2026-33806) só foram corrigidos na linha 5.x. A correção real é **migrar para Fastify 5.8.5 ou superior**.

Boa notícia: **nenhuma vulnerabilidade ativa é diretamente explorável com impacto crítico na configuração atual do projeto** (deploy na Vercel + validação por Zod + middleware sem função de autorização reduzem muito a superfície — detalhes na seção 4). Ainda assim, permanecer em versões EOL significa que **a próxima vulnerabilidade descoberta não terá patch**.

---

## 2. Versões instaladas analisadas (do `pnpm-lock.yaml`)

| Pacote | Versão instalada | Status |
|--------|------------------|--------|
| `next` | 14.2.35 | ⚠️ **EOL — vulnerável (10 CVEs sem patch na linha 14)** |
| `fastify` | 4.29.1 | ⚠️ **EOL — vulnerável (1 CVE + 3 sem avaliação para 4.x)** |
| `react` / `react-dom` | 18.3.1 | ✅ Sem CVE na base |
| `@fastify/jwt` | 8.0.1 | ✅ Sem CVE na base |
| `@fastify/cors` | 9.0.1 | ✅ Sem CVE na base |
| `@fastify/helmet` | 11.1.1 | ✅ Sem CVE na base |
| `@fastify/rate-limit` | 9.1.0 | ✅ Sem CVE na base |
| `fast-jwt` (transitiva) | 4.0.5 | ✅ Sem CVE na base |
| `@prisma/client` / `prisma` | 5.22.0 | ✅ Sem CVE (recomenda-se 6.x por manutenção) |
| `zod` | 3.25.76 | ✅ Sem CVE na base |
| `ioredis` | 5.11.1 | ✅ Sem CVE na base |
| `bcryptjs` | 2.4.3 | ✅ Sem CVE na base |
| `mercadopago` | 3.1.0 | ✅ Sem CVE na base |
| `resend` | 6.12.4 | ✅ Sem CVE na base |
| `@aws-sdk/client-s3` | 3.1075.0 | ✅ Sem CVE na base |
| `vitest` (dev) | 1.6.1 | ✅ Exatamente a versão que corrige CVE-2025-24964 |
| `vite` (dev, transitiva) | 5.4.21 | ✅ Patches da série 2025 aplicados |
| `tailwindcss` / `postcss` | 3.4.19 / 8.4.31+ | ✅ Sem CVE na base |
| `typescript` / `tsx` / `tsup` | 5.9.3 / 4.22.4 / 8.5.1 | ✅ Sem CVE na base |

---

## 3. Vulnerabilidades ATIVAS — Next.js 14.2.35

Todas abaixo afetam a faixa que inclui 14.2.35 e **só têm correção em 15.5.16+ (ou 16.x)**.

| CVE | Severidade | Descrição | Explorável neste projeto? |
|-----|-----------|-----------|---------------------------|
| **CVE-2026-44578** | **8.6 ALTA** | SSRF via requisições de upgrade WebSocket no servidor Node embutido — permite fazer o servidor acessar destinos internos arbitrários (ex.: metadata de nuvem) | **Não na Vercel** (CVE declara "Vercel-hosted deployments are not affected"). **Sim se o web for self-hosted** (VPS/Node) |
| **CVE-2026-44576** | 5.4 MÉDIA | Cache poisoning de respostas React Server Components quando há cache compartilhado (CDN) sem particionamento correto | Parcial — depende de CDN/cache compartilhado na frente do app |
| **CVE-2026-44582** | 3.7 BAIXA | Cache poisoning por colisão no cache-busting de RSC | Parcial — mesmo cenário acima |
| **CVE-2026-44581** | 4.7 MÉDIA | XSS armazenado em apps que usam nonce de CSP atrás de cache compartilhado | **Não** — o projeto não usa CSP com nonce no web |
| **CVE-2026-44580** | 6.1 MÉDIA | XSS via scripts `beforeInteractive` com conteúdo não confiável | **Não** — o projeto não usa `next/script` |
| **CVE-2026-44577** | 5.9 MÉDIA | DoS na API de otimização de imagens (`/_next/image`) em self-hosting — carrega imagens locais inteiras em memória | **Não na Vercel**; risco baixo mesmo self-hosted (projeto não usa `next/image`, sem `remotePatterns` configurados) |
| **CVE-2026-27980** | 6.9 MÉDIA | Crescimento ilimitado do cache de disco de imagens (`.next/cache/images`) → esgota disco. Correção só na 16.1.7 | **Não na Vercel** (sem disco persistente); relevante apenas self-hosted |
| **CVE-2026-44573** | 7.5 ALTA | Bypass de middleware/proxy no Pages Router com i18n | **Não** — projeto usa App Router, sem i18n |
| **CVE-2026-44572** | 3.7 BAIXA | Cache poisoning de redirects do middleware via header `x-nextjs-data` | **Não** — o middleware do projeto só faz `rewrite`, nunca `redirect` |
| **CVE-2026-29057** | 6.3 MÉDIA | HTTP request smuggling quando rewrites apontam para backend externo (`Transfer-Encoding` malformado em DELETE/OPTIONS) | **Não** — os rewrites do middleware são internos (`/loja/{slug}`), não proxy externo |

**Fator de proteção importante:** o middleware do projeto (`apps/web/src/middleware.ts`) **não faz autorização** — só reescreve subdomínio → `/loja/{slug}`. Toda autorização real acontece na API via JWT. Por isso os CVEs de "middleware bypass" não geram acesso indevido aqui; o pior caso seria servir conteúdo público pela URL errada.

### Vulnerabilidades do Next.js JÁ CORRIGIDAS pela 14.2.35 (confirmação)

CVE-2025-29927 (bypass crítico de middleware, corrigido na 14.2.25) ✅ · CVE-2025-57822 (SSRF, 14.2.32) ✅ · CVE-2025-57752 e CVE-2025-55173 (imagens, 14.2.31) ✅ · CVE-2025-48068 (dev server, 14.2.30) ✅ · CVE-2025-32421 (14.2.24) ✅ · CVE-2024-56332 (14.2.21) ✅ · CVE-2024-51479 (14.2.15) ✅ · CVE-2024-46982 (14.2.10) ✅ · CVE-2024-47831 (14.2.7) ✅ · CVE-2024-34351, CVE-2024-34350, CVE-2024-39693 ✅

---

## 4. Vulnerabilidades ATIVAS — Fastify 4.29.1

| CVE | Severidade | Descrição | Explorável neste projeto? |
|-----|-----------|-----------|---------------------------|
| **CVE-2026-3635** | 6.1 MÉDIA | `request.protocol` e `request.host` podem ser falsificados via headers `X-Forwarded-Proto`/`X-Forwarded-Host`. Afeta **todas as versões ≤ 5.8.2** (inclui 4.29.1). Correção apenas na 5.8.3 | **Parcial.** O projeto usa `trustProxy: true` (app.ts:38), então headers `X-Forwarded-*` já são confiados por design. Risco prático: **o rate limiting por IP pode ser contornado falsificando `X-Forwarded-For`** se a request chegar direto na origem (bypass da Vercel/nginx) |

### CVEs do Fastify corrigidos apenas na linha 5.x (4.x EOL, nunca avaliado/corrigido)

| CVE | Severidade | Descrição | Impacto real aqui |
|-----|-----------|-----------|-------------------|
| CVE-2026-25223 | 7.5 ALTA | Bypass de validação de body via caractere TAB no `Content-Type` (fix: 5.7.2) | **Baixo** — o projeto **não usa** validação de schema por content-type do Fastify; todo body é validado com **Zod dentro do handler**, que não é contornável por header |
| CVE-2026-33806 | 7.5 ALTA | Bypass de validação via espaço no início do `Content-Type` (fix: 5.8.5) | **Baixo** — mesmo motivo acima |
| CVE-2026-3419 | 5.3 MÉDIA | Content-Types malformados aceitos (fix: 5.8.1) | **Baixo** — mesmo motivo |
| CVE-2026-25224 | 3.7 BAIXA | DoS por alocação ilimitada em `sendWebStream` (fix: 5.7.3) | **Baixo** — o projeto não responde com ReadableStream |

**Nota:** CVE-2025-32442 (bypass de validação, ALTA) afetava exatamente a 4.29.0 — a versão instalada **4.29.1 é o patch**. ✅

---

## 5. Falsos positivos descartados

| CVE | Motivo |
|-----|--------|
| CVE-2025-13984 | Módulo "Next.js" do **Drupal** — não é o framework |
| CVE-2025-58932 | Tema WordPress chamado "Prisma" — não é o ORM |
| CVE-2026-42349 | SDK **Clerk** (inclui pacote `@clerk/fastify`) — Clerk não é usado no projeto |

---

## 6. Plano de correção

### Fase 1 — Mitigações imediatas (sem upgrade, baixo risco) — fazer agora

1. **Rate limiting resistente a spoofing (CVE-2026-3635):**
   - Garantir `REDIS_URL` configurado em produção (contadores compartilhados — já suportado pelo código).
   - Na Vercel/nginx, garantir que a origem **não seja acessível diretamente** (a API só deve receber tráfego do proxy). Se a API Vercel é pública por natureza, considerar usar o header `x-vercel-forwarded-for` / `x-real-ip` (setado pela plataforma, não spoofável) como `keyGenerator` do `@fastify/rate-limit` em vez do XFF padrão.
2. **Se (e somente se) o web for self-hosted** (VPS com `next start`):
   - Bloquear upgrades WebSocket para o app Next no proxy reverso (mitiga CVE-2026-44578, o único CVE ALTA realmente perigoso).
   - Agendar limpeza periódica de `.next/cache/images` (mitiga CVE-2026-27980).
   - Na Vercel, nada a fazer — a plataforma não é afetada por esses dois.
3. **Cache/CDN:** se houver CDN própria na frente do web (além da Vercel), revisar se a chave de cache inclui os headers de RSC (`RSC`, `Next-Router-State-Tree`, `Next-Router-Prefetch`) — mitiga CVE-2026-44576/44582.

### Fase 2 — Upgrade do Fastify 4 → 5 (prioridade ALTA — API é a superfície crítica)

**Objetivo:** `fastify@^5.8.5` (cobre CVE-2026-3635, 25223, 25224, 3419, 33806).

| Pacote | De | Para |
|--------|----|------|
| `fastify` | 4.29.1 | ^5.8.5 |
| `@fastify/cors` | 9.0.1 | ^11.x |
| `@fastify/helmet` | 11.1.1 | ^13.x |
| `@fastify/jwt` | 8.0.1 | ^10.x |
| `@fastify/rate-limit` | 9.1.0 | ^10.x |
| `fastify-plugin` | 4.5.1 | ^5.x |

Passos:
1. Criar branch `chore/fastify-5`.
2. Atualizar os 6 pacotes juntos (as versões dos plugins acompanham o core).
3. Breaking changes esperados na v5: exige Node ≥ 20 ✅ (projeto já usa 20); remoção de APIs deprecadas (`request.connection`, half-typed hooks); logger config movido para `loggerInstance` se customizado; a maioria do código de rotas não muda.
4. Rodar `pnpm --filter @esqueleton/api lint && pnpm --filter @esqueleton/api test` — a suíte cobre rotas, tenant guard e isolamento multi-tenant, o que dá boa segurança de regressão.
5. Testar manualmente: login, catálogo público, webhook MercadoPago (HMAC), upload de imagem.

### Fase 3 — Upgrade do Next.js 14 → 15.5.16+ (prioridade ALTA)

**Objetivo:** `next@^15.5.16` (cobre todos os 10 CVEs ativos da seção 3, exceto CVE-2026-27980 que é 16.x — mas ele não afeta Vercel).

Passos:
1. Criar branch `chore/next-15`.
2. Rodar o codemod oficial: `npx @next/codemod@canary upgrade latest`.
3. Breaking changes principais do Next 15 a revisar:
   - **APIs de request assíncronas:** `cookies()`, `headers()`, `params`, `searchParams` agora são `await` — o codemod converte a maioria. O projeto usa `[slug]` e `[id]` como params em páginas client (`'use client'` + hooks), o que reduz o impacto.
   - **Caching defaults mudaram:** `fetch` e route handlers GET não são mais cacheados por padrão — comportamento fica mais previsível, não menos seguro.
   - **React 19** vira o padrão do App Router: atualizar `react`/`react-dom` para ^19 e `@types/react`/`@types/react-dom`. O projeto não usa libs presas ao React 18 (só `lucide-react`, compatível).
4. Rodar `pnpm --filter @esqueleton/web lint && pnpm --filter @esqueleton/web test && pnpm --filter @esqueleton/web build`.
5. Testar manualmente: middleware de subdomínio (`meu-slug.localhost:3000`), fluxo admin completo, catálogo público, sacola/favoritos.
6. Deploy em preview na Vercel antes de promover para produção.

### Fase 4 — Manutenção preventiva (prioridade MÉDIA)

1. **Prisma 5.22 → 6.x** — sem CVE hoje, mas a linha 5 sairá de suporte; migração é majoritariamente mecânica (`prisma migrate` continua igual).
2. **Vitest 1.6.1 → 3.x** — a 1.6.1 está patchada, mas a linha 1.x não recebe mais correções. Nunca rodar `vitest --api`/UI exposto em rede (vetor do CVE-2025-24964).
3. Configurar verificação contínua de dependências:
   - `pnpm audit` no CI (falhar build em severidade ≥ HIGH);
   - Dependabot ou Renovate no repositório GitHub para PRs automáticos de patch de segurança.

---

## 7. Ordem recomendada de execução

| # | Ação | Risco se não fizer | Esforço |
|---|------|--------------------|---------|
| 1 | Fase 1 (mitigações imediatas) | Bypass de rate-limit; SSRF se self-hosted | Baixo |
| 2 | Fase 2 (Fastify 5) | API sem patches futuros; spoof de host/protocol | Médio |
| 3 | Fase 3 (Next 15) | Web sem patches futuros; 10 CVEs conhecidos ativos | Médio-Alto |
| 4 | Fase 4 (Prisma 6, Vitest 3, CI de auditoria) | Repetir este ciclo daqui a meses | Baixo |

---

## 8. Limitações desta análise

- A base local `cvelistV5/` contém apenas os anos **2024, 2025 e 2026**. CVEs de 2023 ou anteriores não foram verificados — porém as versões instaladas são todas posteriores aos patches conhecidos dessa época (ex.: `postcss@8.4.31` é exatamente o fix do CVE-2023-44270).
- A análise cobriu dependências diretas + transitivas críticas (`fast-jwt`, `esbuild`, `vite`, `semver`). Um `pnpm audit` complementa com a árvore completa.
- CVEs em estado `RESERVED`/não publicados não aparecem na base.
- A avaliação de explorabilidade assume o deploy documentado no CLAUDE.md (Vercel para web e API). **Se o deploy mudar para VPS/self-hosted, reavaliar a seção 3 — vários "Não explorável" viram "Sim".**
