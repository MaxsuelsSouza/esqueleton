# Melhorias Ranqueadas — Esqueleton SaaS

Compilado a partir de dois conselhos LLM Council (23/jun/2026).
Ordenado do mais critico para o menos urgente.

---

## TIER 1 — Bloqueios de lancamento (resolver antes do piloto)

### 1. Migrar imagens de base64 para upload externo

**Gravidade:** CRITICA — impede escala, degrada banco compartilhado
**Estimativa:** 1-2 dias
**Citado por:** Todos os 10 conselheiros (unanimidade absoluta)

**Problema:**
Imagens de produtos sao armazenadas como `data:image/...;base64,...` diretamente nos campos `imageUrl` (Product, ProductVariant, StoreProfile.logoUrl) e `images[]` (Product). Um produto com 5 fotos ocupa ~15MB no banco. Com 50 produtos por loja, sao ~750MB por loja — num multi-tenant onde todas as lojas compartilham o mesmo PostgreSQL, isso degrada a performance de todas as lojas simultaneamente.

**Funcional:**

- **Endpoint de upload:** `POST /api/upload` (admin, JWT obrigatorio)
  - Recebe a imagem como `multipart/form-data` ou base64 no body
  - Faz upload para Cloudinary (ou Vercel Blob como alternativa)
  - Retorna `{ url: "https://res.cloudinary.com/..." }`
  - Limite: 5MB por imagem, apenas `image/*`
  - A URL retornada e salva no campo `imageUrl` do produto
- **Mudanca no schema de validacao:** `imageUrlSchema` passa a aceitar apenas URLs `http(s)://` — remove aceitacao de `data:image` em producao
- **Frontend:** o componente de upload de foto faz `POST /api/upload` primeiro, recebe a URL, e envia a URL no body do produto (em vez de enviar o base64 inteiro)
- **Migracao de dados existentes:** script one-off que le todos os campos base64 do banco, faz upload para o CDN, e atualiza com a URL resultante
- **Variaveis de ambiente:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (ou `BLOB_READ_WRITE_TOKEN` para Vercel Blob)
- **Sem CDN configurado:** manter comportamento atual (base64) para dev local — aceitar ambos os formatos durante a transicao

---

### ~~2. Tornar WhatsApp obrigatorio no cadastro da loja~~ FEITO

**Gravidade:** CRITICA — sem isso, pedidos nao chegam a ninguem
**Estimativa:** 2-3 horas
**Citado por:** Peer reviews (3 revisores), Chairman

**Problema:**
`StoreProfile.whatsapp` e `String?` (nullable). Quando esta vazio, o link da sacola gera `https://wa.me/?text=...` — abre o WhatsApp sem destinatario. O pedido nao chega ao lojista. Isso acontece em dois fluxos: sacola (`page.hooks.ts:317-320`) e compra rapida (`produto/[id]/page.hooks.ts:332-335`).

**Funcional:**

- **Registro (`POST /api/auth/register` modo publico):**
  - Adicionar campo `whatsapp` (obrigatorio) no body do registro SaaS
  - Validar com `phoneSchema` existente em `shared/validation/schemas.ts`
  - Salvar no `StoreProfile` dentro da mesma transacao que ja cria Store + User
  - Mensagem de erro: `"WhatsApp e obrigatorio para receber pedidos"`
- **Perfil admin (`PUT /api/store-profile`):**
  - `whatsapp` nao pode ser removido (validar que nao e string vazia ou null)
  - Mensagem: `"WhatsApp e obrigatorio — seus clientes enviam pedidos por ele"`
- **Frontend — registro (`/admin/login` modo "Criar minha loja"):**
  - Novo campo "WhatsApp" com mascara de telefone, obrigatorio
  - Placeholder: `"(11) 99999-9999"`
- **Frontend — sacola (fallback de seguranca):**
  - Se `profile.whatsapp` estiver vazio, exibir mensagem `"Esta loja ainda nao configurou o WhatsApp"` e desabilitar o botao de envio
  - Nunca abrir `wa.me` sem numero

---

### ~~3. Pagina de gestao de pedidos no admin~~ FEITO

**Gravidade:** ALTA — proposta central (organizar vendas WhatsApp) esta incompleta
**Estimativa:** 2-3 dias
**Citado por:** Peer reviews (4 revisores), Chairman

**Problema:**
A API ja tem `GET /api/orders` (lista com filtro de status) e `PATCH /api/orders/:orderNumber/status` (muda status). Mas no frontend admin so existe busca por numero no Dashboard. O lojista nao tem visao geral dos pedidos recebidos. Pedidos criados pelo cliente acabam "no vazio" apos o WhatsApp.

**Funcional:**

- **Nova pagina:** `/admin/pedidos`
- **Nav:** adicionar "Pedidos" no menu do admin layout (entre Dashboard e Produtos)
- **Layout da pagina:**
  - Abas ou filtro por status: `Todos | Pendentes | Vendidos | Nao vendidos`
  - Badge com contagem de pedidos PENDING no menu lateral
  - Lista de pedidos ordenada por data (mais recente primeiro)
  - Cada card de pedido exibe:
    - Numero do pedido (`#ABC123`)
    - Data/hora
    - Nome e telefone do cliente (se informado)
    - Itens (nome do produto, quantidade, preco unitario)
    - Total e desconto (se houver cupom)
    - Status atual com cor (PENDING=amarelo, SOLD=verde, NOT_SOLD=vermelho)
  - Acoes por pedido:
    - Botao "Confirmar venda" (muda para SOLD) — `PATCH /api/orders/:orderNumber/status`
    - Botao "Nao vendido" (muda para NOT_SOLD)
    - Botao "Abrir WhatsApp" — link `wa.me/{telefone}` do cliente
- **Services:** criar `apps/web/src/services/orders.service.ts`
  - `listOrders(token, status?)` → `GET /api/orders?status=...`
  - `updateOrderStatus(token, orderNumber, status)` → `PATCH /api/orders/:orderNumber/status`
- **Paginacao:** nao necessaria na v1 (API ja limita a 100), avaliar depois

---

## TIER 2 — Importantes para o piloto

### ~~4. Onboarding do primeiro acesso~~ FEITO

**Gravidade:** ALTA — sem guia, lojista nao-tech abandona no primeiro minuto
**Estimativa:** 2-3 dias
**Citado por:** Contrario, Outsider, Executor, Primeiro Principios

**Problema:**
Apos criar a loja, o lojista cai num painel com 8+ itens de menu e nenhuma orientacao. Para solopreneurs nao-tech, isso e abandono imediato. O trial de 7 dias comeca a contar e o lojista pode nem ter cadastrado o primeiro produto.

**Funcional:**

- **Checklist de configuracao inicial** (exibido no Dashboard enquanto incompleto):
  1. "Configure o WhatsApp da loja" → link para `/admin/perfil`
  2. "Adicione o logo da loja" → link para `/admin/perfil`
  3. "Cadastre seu primeiro produto" → link para `/admin/produtos`
  4. "Veja como seus clientes verao sua loja" → link para `/loja/{slug}`
  5. "Compartilhe o link da sua loja" → botao de copiar URL + compartilhar WhatsApp
- **Progresso visual:** barra de progresso (ex: "3 de 5 completos")
- **Verificacao automatica:** cada item verifica no banco se ja foi feito
  - WhatsApp: `StoreProfile.whatsapp` preenchido
  - Logo: `StoreProfile.logoUrl` preenchido
  - Produto: `Product.count({ storeId }) > 0`
  - Os itens "ver loja" e "compartilhar" sao marcados manualmente (localStorage)
- **Descartavel:** botao "Ja sei o que fazer, fechar" que esconde permanentemente (localStorage)
- **Endpoint:** `GET /api/store-profile/onboarding-status` retorna `{ whatsapp: bool, logo: bool, hasProducts: bool }`

---

### ~~5. Toggle `isAvailable` no Product~~ FEITO

**Gravidade:** MEDIA-ALTA — lojista nao consegue marcar produto como indisponivel
**Estimativa:** 1-2 horas
**Citado por:** Council 1 (unanimidade), ja em implementacao

**Problema:**
`Product` nao tem campo de disponibilidade. `ProductVariant` tem `active: Boolean`, mas o produto em si nao tem toggle. Para esconder um produto esgotado, o lojista precisa excluir e recadastrar depois.

**Funcional:**

- **Schema Prisma:** `isAvailable Boolean @default(true)` no model Product
- **Migracao:** `ALTER TABLE "Product" ADD COLUMN "isAvailable" BOOLEAN NOT NULL DEFAULT true`
- **Schema Zod:** `isAvailable: z.boolean().default(true)` no `productSchema`
- **Tipo compartilhado:** `isAvailable: boolean` na interface `Product`
- **Rotas publicas:** filtrar `isAvailable: true` em `listarProdutos()` e `GET /:id`
- **Rotas admin:** retornar todos os produtos (incluindo indisponiveis)
- **Frontend admin — lista de produtos:**
  - Toggle visual (switch) ao lado de cada produto
  - Produto indisponivel aparece com opacidade reduzida
  - Ao clicar o toggle: `PUT /api/products/:id` com `{ isAvailable: false/true }`
- **Frontend publico — catalogo:**
  - Produtos com `isAvailable: false` nao aparecem na listagem nem na busca
  - Acesso direto via URL (`/loja/slug/produto/id`) retorna 404

---

### 6. Aumentar o periodo de trial

**Gravidade:** MEDIA — 7 dias e insuficiente para publico nao-tech
**Estimativa:** 30 minutos
**Citado por:** Contrario

**Problema:**
`TRIAL_DIAS = 7` em `domain/billing/trial.ts`. Para solopreneurs que nao sao tech-savvy, 7 dias mal da tempo de cadastrar os produtos. Quando comecam a gostar, o catalogo morre e voltam pro Instagram.

**Funcional:**

- **Alterar constante:** `TRIAL_DIAS` de `7` para `14` (ou `30`) em `apps/api/src/domain/billing/trial.ts`
- **Alterar `TRIAL_MS`:** correspondente
- **Frontend:** textos que mencionam "7 dias" devem ser atualizados (`/admin/assinatura`, `/admin/plano`, etc.)
- **Decisao de produto:** definir se lojas existentes em trial ganham a extensao ou nao (sugestao: sim, recalcular pela nova constante)

---

## TIER 3 — Melhorias de valor (pos-piloto, antes do lancamento comercial)

### ~~7. Meta tags OG dinamicas para compartilhamento~~ FEITO

**Gravidade:** MEDIA — multiplica distribuicao organica
**Estimativa:** 3-4 horas
**Citado por:** Expansionista

**Problema:**
Links da loja compartilhados no WhatsApp/Instagram nao geram preview (titulo, imagem, descricao). O lojista compartilha `plataforma.com/loja/meu-slug` e o cliente ve apenas uma URL crua.

**Funcional:**

- **`/loja/[slug]/layout.tsx`** — `generateMetadata()`:
  - Buscar `StoreProfile` (nome, logo, descricao) via API
  - Retornar `title`, `description`, `openGraph.images` com a logo da loja
  - `og:title`: nome da loja
  - `og:description`: descricao ou "Confira nossos produtos"
  - `og:image`: `logoUrl` da loja
- **`/loja/[slug]/produto/[id]/page.tsx`** — `generateMetadata()`:
  - Buscar produto via API
  - `og:title`: `{nome do produto} | {nome da loja}`
  - `og:description`: descricao do produto (truncada em 160 chars)
  - `og:image`: `imageUrl` do produto
  - `og:type`: `product`
  - `product:price:amount` e `product:price:currency` (BRL)
- **Depende de:** item #1 (imagens externas) — imagens base64 nao funcionam como `og:image`

---

### 8. Reconciliacao de assinatura MercadoPago

**Gravidade:** MEDIA — webhook pode falhar silenciosamente
**Estimativa:** 4-6 horas
**Citado por:** Peer review (1 revisor)

**Problema:**
O fluxo de assinatura: lojista clica "Assinar" → redireciona para checkout MercadoPago → webhook `POST /api/webhooks/mercadopago` atualiza status para ACTIVE. Se o webhook falhar (timeout, erro 5xx, MercadoPago fora), a assinatura fica PENDING para sempre. Lojista pagou mas nao recebe acesso.

**Funcional:**

- **Job de reconciliacao:** rota `POST /api/billing/reconcile` (super-admin ou cron)
  - Busca assinaturas com status `PENDING` ha mais de 1 hora
  - Para cada uma, consulta a API do MercadoPago (`GET /preapproval/{id}`) para verificar status real
  - Atualiza no banco se a assinatura ja foi paga
- **Alerta ao lojista:** se assinatura esta PENDING ha mais de 24h, exibir banner no admin:
  - `"Seu pagamento esta sendo processado. Se ja pagou, entre em contato."`
- **Notificacao ao super-admin:** criar `Notification` tipo `SUBSCRIPTION_PENDING_STALE` quando PENDING > 24h
- **Pagina admin `/admin/plano`:** exibir status da assinatura com clareza
  - PENDING: "Aguardando confirmacao de pagamento..."
  - ACTIVE: "Plano ativo"
  - PAUSED: "Pagamento com problema"

---

### 9. Validar `unitPrice` contra o banco na criacao do pedido

**Gravidade:** MEDIA — risco aceito atualmente, mas fragil para producao
**Estimativa:** 3-4 horas
**Citado por:** Peer review (2 revisores), Council 1 (Contrario, Executor)

**Problema:**
`POST /api/lojas/:slug/orders` recebe `unitPrice` do cliente. O servidor verifica apenas a aritmetica (lineTotal = unitPrice x quantity). Um usuario tecnico pode alterar precos no request e o pedido e aceito com valores manipulados.

**Funcional:**

- **Na rota `POST /api/lojas/:slug/orders`:**
  - Extrair `productId` de cada item do body (ja existe no JSON de items)
  - Buscar os produtos no banco: `prisma.product.findMany({ where: { id: { in: productIds }, storeId } })`
  - Para cada item, comparar `unitPrice` do request com `price` do banco (ou `ProductVariant.price` se variante)
  - Tolerancia: 1 centavo (arredondamento)
  - Se houver divergencia: retornar `400 "O preco de um ou mais produtos mudou. Atualize sua sacola."`
- **Aplicar promocoes server-side:** se o produto tem promocao ativa, calcular o preco com desconto no servidor e comparar
- **Nota:** isso muda o risco aceito documentado no CLAUDE.md — atualizar a secao "Known accepted risks"

---

### 10. URL amigavel / subdominio para lojas

**Gravidade:** MEDIA — lojista quer compartilhar link bonito
**Estimativa:** meio dia (subdominio) a 2 dias (dominio custom)
**Citado por:** Expansionista, Executor

**Problema:**
URL atual: `plataforma.com/loja/meu-slug`. Lojista prefere `meu-slug.plataforma.com` ou `minhaperfumaria.com.br`. Para Instagram e WhatsApp, URLs curtas e limpas convertem melhor.

**Funcional — Fase 1 (subdominio):**

- **Middleware Next.js** (`middleware.ts`):
  - Detectar subdominios: `{slug}.plataforma.com`
  - Rewrite para `/loja/{slug}` internamente (sem redirect)
  - Manter `/loja/{slug}` funcionando como fallback
- **DNS:** wildcard `*.plataforma.com` apontando para Vercel
- **Vercel:** configurar wildcard domain

**Funcional — Fase 2 (dominio custom, pos-lancamento):**

- Novo campo `customDomain` no `Store`
- API Vercel Domains para registrar o dominio programaticamente
- Feature de plano premium (usar `checkPlanLimit`)

---

## TIER 4 — Nice-to-have (pos-lancamento)

### 11. Notificacoes para o lojista quando entra pedido

**Gravidade:** BAIXA-MEDIA — melhora experiencia mas nao bloqueia
**Estimativa:** 1-2 dias
**Citado por:** Expansionista

**Problema:**
O lojista so sabe que tem pedido novo se abrir o painel ou receber no WhatsApp. O modelo `Notification` ja existe com tipo `NEW_ORDER` e o pedido ja cria essa notificacao. Falta exibi-la no admin e, opcionalmente, enviar por e-mail.

**Funcional:**

- **Badge no menu admin:** icone de sino com contagem de notificacoes nao lidas
- **Dropdown de notificacoes:** ultimas 10, com link para o pedido
- **Endpoint:** `GET /api/notifications` (ja existe? verificar) + `PATCH /api/notifications/:id/read`
- **E-mail opcional:** ao criar notificacao `NEW_ORDER`, enviar e-mail via Resend se configurado
  - Template: "Novo pedido #{numero} na sua loja — {nome do cliente}, R${total}"
  - Configuravel no perfil: "Receber e-mail a cada novo pedido" (toggle)

---

### 12. Catalogo como PWA (Progressive Web App)

**Gravidade:** BAIXA — melhora retencao do cliente final
**Estimativa:** 3-4 horas
**Citado por:** Expansionista

**Problema:**
O cliente do lojista abre o catalogo no navegador. Se pudesse "instalar" como app no celular, o lojista ganha retencao sem esforco.

**Funcional:**

- **`next-pwa`** ou configuracao manual de service worker
- **`manifest.json` dinamico** por loja:
  - `name`: nome da loja
  - `short_name`: slug
  - `icons`: logo da loja
  - `start_url`: `/loja/{slug}`
  - `theme_color`: `StoreProfile.themeColor`
- **Endpoint:** `GET /api/lojas/:slug/manifest.json` que retorna manifest personalizado
- **`<link rel="manifest">` no layout da loja**
- **Depende de:** item #1 (imagens externas) e item #7 (meta tags)

---

### 13. Integracao WhatsApp Business API

**Gravidade:** BAIXA — diferencial competitivo mas alto investimento
**Estimativa:** 1-2 semanas
**Citado por:** Primeiro Principios

**Problema:**
O fluxo atual e um link `wa.me` que abre o WhatsApp do cliente. O lojista recebe a mensagem e confirma manualmente. Nao ha rastreio, confirmacao de recebimento, nem templates.

**Funcional (escopo reduzido para v1):**

- **Integracao com WhatsApp Business API** via provedor (Twilio, MessageBird, ou Meta Cloud API direta)
- **Envio de mensagem template** ao lojista quando chega pedido (em vez de depender que o cliente abra o WhatsApp)
- **Confirmacao de recebimento** no sistema (webhook de status da mensagem)
- **Configuracao:** `WHATSAPP_API_TOKEN` + `WHATSAPP_PHONE_ID` no `.env`
- **Custo:** WhatsApp Business API cobra por mensagem (~R$0,30/template). Avaliar se faz sentido para o publico-alvo.
- **Alternativa mais simples:** webhook generico (Zapier/n8n) que o lojista configura para receber notificacao em qualquer canal

---

### 14. Validacao de product-market fit com piloto

**Gravidade:** CRITICA (mas nao e codigo — e processo)
**Estimativa:** 30 dias
**Citado por:** Contrario, Outsider, Primeiro Principios, Chairman

**Problema:**
Nenhum lojista real testou a plataforma. Sem essa validacao, nao ha evidencia de que o produto resolve o problema.

**Funcional (processo, nao codigo):**

- Recrutar 5 lojistas reais (perfumarias, cosmeticos, banho)
- Criar contas manualmente com trial estendido (30-60 dias)
- Acompanhar por 30 dias, medindo:
  - Quantos produtos cadastraram?
  - Quantos pedidos receberam pelo catalogo?
  - Voltam ao painel diariamente?
  - Onde travam? (observar ou pedir feedback)
  - Pagariam R$X/mes por isso?
- **Criterio de sucesso:** pelo menos 3 de 5 lojistas usam ativamente apos 30 dias sem acompanhamento
- **Se falhar:** pivotar antes de investir mais codigo

---

### 15. Simplicidade da interface para o publico-alvo

**Gravidade:** BAIXA — polimento pos-validacao
**Estimativa:** ongoing
**Citado por:** Outsider

**Problema:**
A plataforma tem complexidade desproporcional ao publico: categorias em arvore infinita, promocoes com multiplos tipos, cupons com regras compostas. A vendedora de bairro talvez so precise de foto + preco + link.

**Funcional:**

- **Nao remover features** — mas simplificar a apresentacao:
  - Esconder "Categorias", "Promocoes", "Cupons" e "Destaques" do menu por padrao
  - Revelar quando o lojista clica em "Mais opcoes" ou "Ferramentas avancadas"
  - Ou: disponibilizar por plano (free = basico, premium = tudo)
- **Tela inicial simplificada:** so Produtos e Pedidos no primeiro nivel
- **Avaliar no piloto:** observar quais features os 5 lojistas realmente usam

---

## Resumo — Ordem de execucao sugerida

| # | Melhoria | Estimativa | Tier |
|---|----------|-----------|------|
| 1 | Upload externo de imagens (CDN) | 1-2 dias | Bloqueio |
| ~~2~~ | ~~WhatsApp obrigatorio no cadastro~~ | ~~2-3 horas~~ | ~~Bloqueio~~ |
| ~~3~~ | ~~Pagina de gestao de pedidos~~ | ~~2-3 dias~~ | ~~Bloqueio~~ |
| ~~4~~ | ~~Onboarding do primeiro acesso~~ | ~~2-3 dias~~ | ~~Piloto~~ |
| ~~5~~ | ~~Toggle isAvailable no Product~~ | ~~1-2 horas~~ | ~~Piloto~~ |
| 6 | Aumentar trial para 14-30 dias | 30 min | Piloto |
| 14 | Piloto com 5 lojistas reais | 30 dias | Validacao |
| ~~7~~ | ~~Meta tags OG dinamicas~~ | ~~3-4 horas~~ | ~~Pre-lancamento~~ |
| 8 | Reconciliacao MercadoPago | 4-6 horas | Pre-lancamento |
| 9 | Validar unitPrice no servidor | 3-4 horas | Pre-lancamento |
| 10 | URL amigavel / subdominio | 0.5-2 dias | Pre-lancamento |
| 11 | Notificacoes de pedido | 1-2 dias | Pos-lancamento |
| 12 | PWA | 3-4 horas | Pos-lancamento |
| 13 | WhatsApp Business API | 1-2 semanas | Pos-lancamento |
| 15 | Simplificar interface | ongoing | Pos-lancamento |

**Tempo total ate o piloto:** ~1 semana de desenvolvimento focado (itens 1-6)
**Tempo ate o lancamento comercial:** piloto de 30 dias + ajustes baseados no feedback + itens 7-10
