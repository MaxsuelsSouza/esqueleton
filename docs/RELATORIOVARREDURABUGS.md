# Relatório de varredura — bugs e erros invisíveis do dia a dia

> Varredura completa das telas do web (catálogo público + painel admin + plataforma) e dos
> pontos da API que cada tela consome. O foco foi em **erros silenciosos**: aqueles que não
> quebram a tela na hora, mas fazem dados sumirem, valores errados aparecerem ou fluxos
> falharem sem ninguém perceber.
>
> Data da varredura: 2026-07-01 · Nenhum código foi alterado — este arquivo é só o diagnóstico.

**Legenda de severidade**

- 🔴 **Crítico** — perda silenciosa de dados ou fluxo essencial quebrado
- 🟠 **Alto** — funcionalidade que parece funcionar mas não funciona
- 🟡 **Médio** — comportamento errado em situações comuns do dia a dia
- ⚪ **Menor** — incômodo ou inconsistência de UX

---

## 🔴 Críticos

### 1. Pedidos com promoção (percentual/fixa) NUNCA são salvos no painel

A sacola envia o `subtotal` calculado com os **preços originais** (antes da promoção),
mas a API exige que `subtotal == soma dos lineTotal` (que usam o preço **com** promoção).
Qualquer pedido contendo um item com promoção percentual ou de valor fixo é rejeitado
com 400 ("Os valores do pedido não conferem").

Como o salvamento é *fire-and-forget* (`ordersService.create` engole qualquer erro),
**o WhatsApp abre normalmente, o cliente acha que pediu, mas o pedido nunca aparece
em "Pedidos" nem no Dashboard** — e o lojista nunca fica sabendo.

- Web: `apps/web/src/app/loja/[slug]/sacola/page.hooks.ts:451` (envia `subtotal: selectedSubtotal`, que soma `originalPrice ?? effectivePrice`)
- API: `apps/api/src/domain/order/services/order.service.ts:230` (`subtotalNaoConfere`)
- Silenciador: `apps/web/src/modules/orders/services/orders.service.ts:23` (catch vazio)

**Correção sugerida:** a sacola deve enviar `subtotal = soma dos lineTotal` (pós-promoção)
e `discount` apenas com cupom + descontos especiais — que é exatamente o contrato que os
testes da API esperam (`order.routes.test.ts`).

### 2. Pedidos com cupom NUNCA são salvos (e o limite de usos nunca conta)

A API valida o `unitPrice` de cada item **já com o desconto do cupom aplicado**
(ver `order.routes.test.ts:152-160`: cupom de R$10 → `unitPrice: 90`). A sacola envia o
`unitPrice` **sem** o cupom (o cupom vai agregado no campo `discount`). Resultado:
qualquer pedido com cupom válido em produto elegível é rejeitado com
"O preço de um ou mais produtos mudou" — silenciosamente, pelo mesmo motivo do item 1.

Efeito colateral grave: o `usedCount` do cupom só incrementa quando o pedido é salvo.
Como pedidos com cupom nunca são salvos, **`maxUses` nunca é atingido** — um cupom
"limitado a 10 usos" pode ser usado infinitamente no WhatsApp.

- Web: `apps/web/src/app/loja/[slug]/sacola/page.hooks.ts:441-455`
- API: `apps/api/src/domain/order/services/order.service.ts:157-163`

### 3. Redefinir senha / verificar e-mail é inacessível para quem está deslogado

O `AdminLayout` chama `useAdminAuth()` **antes** de verificar se a página é pública
(`apps/web/src/app/admin/layout.tsx:47`), e o hook redireciona para `/admin/login`
sempre que não há `admin_token` no navegador
(`apps/web/src/modules/auth/hooks/useAdminAuth.ts:38-39`), sem exceção para as
`PUBLIC_PAGES`.

No dia a dia:
- Quem esqueceu a senha clica no link do e-mail (`/admin/redefinir-senha?token=xxx`)
  em um navegador sem sessão → é **jogado de volta para o login** sem conseguir redefinir.
- O mesmo vale para `/admin/esqueci-senha` e `/admin/verificar-email` abertos fora do
  navegador onde a pessoa está logada (caso comum: e-mail aberto no celular).

**Correção sugerida:** o `useAdminAuth` deve receber/detectar rotas públicas e não
redirecionar nelas (ou o layout só chamar a verificação fora das `PUBLIC_PAGES`).

### 4. Fuso horário: promoções/cupons mudam de comportamento à noite e pedidos são rejeitados na janela de horário

Todas as verificações de data/hora misturam **data em UTC** com **hora local**:

```ts
const today = now.toISOString().split('T')[0]   // data em UTC
const currentTime = now.toTimeString().slice(0, 5) // hora LOCAL da máquina
```

Consequências reais no Brasil (UTC−3):

1. **Datas viram 3h mais cedo:** a partir das 21:00 locais, `today` já é "amanhã".
   Uma promoção com `endDate` de hoje **para de valer às 21:00**; uma agendada para
   amanhã **começa às 21:00 de hoje**. Vale para promoções, cupons e destaques,
   no navegador e na API.
2. **Janela de horário quebra pedidos:** o navegador avalia `startTime`/`endTime` na
   hora local do cliente, mas a API (Vercel roda em UTC) avalia na hora do servidor.
   Uma promoção "18:00–20:00" fica ativa no catálogo às 18h de Brasília, mas o servidor
   (21h UTC) considera a promoção **inativa** → `validateOrderPrices` espera preço cheio,
   a sacola envia preço promocional → **pedido rejeitado silenciosamente** (ver itens 1/2).

- Web: `apps/web/src/modules/promotions/utils/promotions.ts:8-15`, `modules/coupons/utils/coupons.ts:22`, `modules/featured/utils/featured.ts:8-15`, `app/admin/cupons/page.hooks.ts:263`, `app/admin/destaques/page.hooks.ts:254-279`
- API: `apps/api/src/domain/order/services/order.service.ts:57-66`, `apps/api/src/domain/pricing/services/coupon.service.ts:16`

**Correção sugerida:** definir um fuso de referência da loja (ex.: `America/Sao_Paulo`)
e usar o mesmo cálculo nos dois lados.

---

## 🟠 Altos

### 5. Impossível "limpar" campos opcionais — o valor removido volta sozinho

Duas causas somadas:

1. Os schemas da API transformam `null`/`''` em `undefined`
   (`.nullish().transform(v => v || undefined)`), e o Prisma **ignora** `undefined`
   no update — ou seja, mesmo que o front envie `null`, nada é apagado.
2. O front geralmente envia `undefined` (ex.: `maxUses: hasMaxUses ? form.maxUses : undefined`),
   que o `JSON.stringify` simplesmente **descarta do corpo da requisição**.

O que o lojista vive: remove a foto do produto, apaga a descrição, desliga o
"limite de usos" do cupom, remove a janela de horário da promoção, apaga o Instagram
do perfil… clica em salvar, tudo parece OK, **e ao recarregar o valor antigo está lá de novo**.

Campos afetados (não exaustivo):
- Produto: `description`, `brand`, `imageUrl` (`apps/api/src/http/schemas/catalog.schema.ts:11-16`)
- Cupom: `maxUses`, `maxUsesPerUser`, `minimumOrderValue`, `startDate`, `endDate`, `description` (`coupon.schema.ts:13-24`)
- Promoção: `startTime`, `endTime`, `startDate`, `endDate`, `discountPercent`, `discountValue`, `description` (`promotion.schema.ts:10-20`) — só `color` trata `null` corretamente
- Destaque: janelas de data/horário (`apps/web/src/app/admin/destaques/page.hooks.ts:126-129`)
- Perfil da loja: `address`, `whatsapp`, `instagram`, `logoUrl` (`apps/web/src/app/admin/perfil/page.hooks.ts:100-107`)

**Correção sugerida:** adotar a convenção do campo `color` (aceitar `null` e gravar `null`)
e fazer o front enviar `null` explícito ao limpar.

### 6. Editar qualquer coisa em um produto recria as variantes — e quebra sacolas dos clientes

No modal de edição, o `buildDiff` compara as variantes do formulário (sem `id`) com as do
banco (com `id`) via `JSON.stringify` — **nunca são iguais**, então toda edição envia
`variants`, e o PUT da API **apaga e recria todas as variantes com IDs novos**
(`apps/api/src/http/routes/catalog/catalog.routes.ts:183-199`).

Enquanto isso, a sacola dos visitantes guarda `variantId` (Redis, sessão de dias).
Depois de qualquer edição do produto, o `variantId` fica órfão e a sacola
**silenciosamente volta a cobrar o preço base do produto** em vez do preço da variante
(`apps/web/src/app/loja/[slug]/sacola/page.hooks.ts:121-135` — `find` falha e cai no fallback).
Como a API valida o preço contra "base OU qualquer variante ativa", o pedido passa com o valor errado.

- Web: `apps/web/src/app/admin/produtos/page.hooks.ts:242` + `apps/web/src/shared/utils/diff.ts:20`

### 7. Promoção tipo "Kit" muda o preço unitário do produto avulso

`applyPromotionToProduct` (kit) troca o preço do produto por `kitPrice / nº de produtos`
no catálogo, na página de detalhe e na sacola — **mesmo que o cliente compre só um item
do kit**. E a validação da API aceita esse preço (`computePromotedPrice` faz a mesma conta).
Ex.: kit de 3 itens por R$100 → cada item passa a ser vendido **sozinho** por R$33,33.

- Web: `apps/web/src/modules/promotions/utils/promotions.ts:110-122`
- API: `apps/api/src/domain/order/services/order.service.ts:94-97`

### 8. `minimumOrderValue` e `maxUsesPerUser` do cupom não são aplicados em lugar nenhum

O admin cadastra "valor mínimo do pedido" e "limite por usuário", a API grava e até
devolve `minimumOrderValue` na rota pública — mas **nem a sacola nem a validação de
pedido conferem esses campos**. Cupom com pedido mínimo de R$100 desconta em pedido de R$10.

- Sacola calcula desconto sem checar mínimo: `apps/web/src/app/loja/[slug]/sacola/page.hooks.ts:317-333`
- API valida apenas ativo/datas/maxUses: `apps/api/src/domain/pricing/services/coupon.service.ts`

### 9. Sessão expira (JWT dura 1 dia) e o painel inteiro "quebra" com erros genéricos

Nenhuma tela trata resposta 401: o `useAdminAuth` só verifica se o token **existe** no
localStorage (não a validade), e os hooks capturam qualquer erro como
"Erro ao salvar" / "Não foi possível carregar…". No dia seguinte ao login, o lojista abre
o painel e vê listas vazias e salvamentos falhando **sem nenhuma indicação de que precisa
logar de novo**.

- `apps/web/src/modules/auth/hooks/useAdminAuth.ts` (não checa `exp` do payload)
- `apps/web/src/shared/services/api-client.ts` (não intercepta 401)

### 10. "Compre X Leve Y" configurado para "todos os produtos" nunca desconta

A promoção com restrição "todos" salva `productIds: []`. O catálogo mostra o badge em
todos os produtos (lista vazia = vale para todos), mas o cálculo do desconto na sacola
exige `promo.productIds.length > 0` — **o brinde nunca é concedido**. O mesmo filtro
existe na API (`computeExpectedSpecialDiscount`). Kits com "todos" têm o mesmo problema.

- Web: `apps/web/src/app/loja/[slug]/sacola/page.hooks.ts:175` e `212`
- API: `apps/api/src/domain/order/services/order.service.ts:194`

### 11. O campo `discount` do pedido não é validado contra as promoções reais

`computeExpectedSpecialDiscount` existe na API mas **nunca é chamado**
(`grep` só encontra a definição). A rota de pedidos valida preços unitários e a
aritmética, mas o `discount` em si só precisa ser `≤ subtotal` — uma requisição montada
à mão pode declarar `discount = subtotal` e registrar um pedido com total ≈ R$0 que o
lojista verá como legítimo no painel.

- `apps/api/src/domain/order/services/order.service.ts:185` (função órfã)
- `apps/api/src/http/routes/order/order.routes.ts:24` (só `validateOrderArithmetic` + preços)

---

## 🟡 Médios

### 12. Sacola: item desmarcado volta a ficar marcado sozinho

O efeito que sincroniza a seleção re-adiciona **qualquer** chave que não esteja no set
(`apps/web/src/app/loja/[slug]/sacola/page.hooks.ts:264-277`). Se o cliente desmarca o
item A e depois altera a quantidade do item B (ou a sacola recarrega), o item A é
re-selecionado e **vai junto no pedido do WhatsApp sem o cliente perceber**.

### 13. Admin: trocar busca/filtro não volta para a página 1

Em `produtos`, mudar `search`/`filterCategory`/`sortBy` mantém a página atual
(`apps/web/src/app/admin/produtos/page.hooks.ts:98-102`). Estando na página 3 e digitando
uma busca com poucos resultados, a tela mostra "nenhum produto encontrado" mesmo havendo
resultados (que estão na página 1). O mesmo padrão existe em `super/lojas`
(`page.hooks.ts:26-50`, que também dispara **uma requisição por tecla**, sem debounce).

### 14. Lista de pedidos limitada a 100, sem paginação

A API corta em `take: 100` (`apps/api/src/http/routes/order/order.routes.ts:143`) e a
tela não pagina. Depois do 100º pedido, os antigos **desaparecem** da lista — só são
encontráveis pela busca por número exato no Dashboard.

### 15. Mensagens de erro específicas da API são descartadas

Ao salvar produto, o `catch` ignora a mensagem do servidor
(`apps/web/src/app/admin/produtos/page.hooks.ts:250-251`). Quando o lojista bate no
**limite de produtos do plano** (403 com mensagem explicando), a tela mostra apenas
"Erro ao salvar o produto. Tente novamente." — ele tenta de novo para sempre em vez de
fazer upgrade. Mesmo padrão em categorias, promoções e destaques. O login também converte
qualquer falha (rate limit 429, servidor fora) em "E-mail ou senha inválidos."
(`apps/web/src/app/admin/login/page.hooks.ts:108`).

### 16. Promoção/cupom "por categoria" é uma fotografia do momento

A seleção por categoria é expandida para `productIds` **no salvar**
(`apps/web/src/app/admin/promocoes/page.hooks.ts:144-151`, `cupons/page.hooks.ts:137-144`).
Produtos cadastrados depois na mesma categoria **não entram** na promoção — e ao reabrir
para editar, o modo volta como "produtos específicos", escondendo a intenção original.

### 17. Busca do catálogo público: uma requisição por tecla e resultados fora de ordem

`handleSearchChange` altera `filters` e o efeito busca imediatamente, sem debounce nem
`AbortController` (`apps/web/src/app/loja/[slug]/page.hooks.ts:67-92`). Digitação rápida
gera rajada de requests e uma resposta antiga pode chegar **depois** da mais nova,
sobrescrevendo a listagem com resultados errados. Bônus: o efeito também depende de
`categories`, então o catálogo é buscado **duas vezes** em todo carregamento inicial.

### 18. Busca do cabeçalho mostra preço sem promoção e Enter não faz nada

O dropdown do header exibe `product.price` cru — produto em promoção aparece com preço
cheio, diferente do card logo abaixo (`apps/web/src/shared/layout/header/SearchBar.tsx:194`).
E como o `Header` não passa `onSearch`, apertar **Enter** sem navegar pelas setas
simplesmente não faz nada (`SearchBar.tsx:119`).

### 19. Filtro e ordenação por preço ignoram promoções

O filtro `priceMin/priceMax` e o sort `price-asc/desc` rodam no banco sobre o **preço
original** (`apps/api/src/domain/catalog/services/product.service.ts:100-109`), mas os
cards exibem o preço promocional. Produto de R$60 promovido a R$45 **não aparece** no
filtro "até R$50", e a ordenação "menor preço" fica visualmente errada.

### 20. Via subdomínio, a barra de avisos nunca aparece

`AnnouncementBar` só renderiza quando `pathname === /loja/{slug}`
(`apps/web/src/shared/layout/header/AnnouncementBar.tsx:42`), mas em acesso por
subdomínio o `usePathname()` reflete a URL do navegador (`/`), não o rewrite interno.
Os avisos configurados no perfil somem para quem acessa `minhaloja.plataforma.com`.
Qualquer outra comparação com `pathname` baseada em `/loja/...` tem o mesmo risco.

### 21. Favoritos: flash de "vazio", recarga que não acontece e limite de 100

- A página não usa o `isLoading` do contexto: enquanto os IDs carregam do Redis,
  `favoriteIds = []` mostra "nenhum favorito" e some (`favoritos/page.hooks.ts:21-26`).
- O efeito depende de `favoriteIds.length`: trocar um favorito por outro (mesma
  quantidade) **não** recarrega os produtos (`page.hooks.ts:38`).
- A busca por IDs corta em 100 na API (`product.service.ts:62`) — favoritos além disso
  somem silenciosamente. O mesmo vale para sacolas com mais de 100 produtos distintos.

### 22. Chave de item da sacola pode colidir entre variantes diferentes

`itemKey` usa só os **valores** das opções (`Object.values(opts).join(',')`) —
`{Cor: "Preto"}` e `{Material: "Preto"}` geram a mesma chave, e a ordem de inserção das
opções muda a chave (`sacola/page.hooks.ts:40-44`). Seleções/remoções podem afetar o
item "errado" em produtos com múltiplos grupos de opções.

### 23. Validação de telefone inconsistente entre sacola e página de produto

Sacola aceita qualquer coisa com 8+ caracteres (`sacola/page.hooks.ts:494`); a página de
produto exige 10–11 dígitos com DDD (`produto/[id]/page.hooks.ts:388-389`). O mesmo
cliente é aceito num fluxo e rejeitado no outro — e o telefone frouxo da sacola vai para
o banco via `customersService.upsert`.

### 24. Verificar e-mail: recarregar a página mostra erro depois do sucesso

O token é de uso único e a verificação roda num `useEffect`
(`verificar-email/page.hooks.ts:15-48`). Se o usuário recarrega a página (ou em dev, com
o StrictMode montando 2×), a segunda chamada falha e a tela diz "link expirado" mesmo com
o e-mail já verificado — gerando reenvios e suporte desnecessários.

### 25. Sino de notificações: marcar UMA como lida zera o contador inteiro

A página dispara o evento `notifications-read` tanto no "marcar todas" quanto no marcar
**uma** (`notificacoes/page.hooks.ts:103`), e o sino zera o badge ao recebê-lo
(`NotificationBell.tsx:40-42`). Com 5 não lidas, ler 1 faz o badge sumir por até 60s
(próximo polling). Detalhe: há **dois** sinos montados (sidebar + header mobile), cada um
com seu polling de 60s — o dobro de requisições.

### 26. Popup de pedido pendente se auto-descarta e não leva ao pedido

O `PendingOrdersPopup` grava no `sessionStorage` **antes** de o lojista ver/interagir
(`PendingOrdersPopup.tsx:43`) — se o popup renderizar numa aba que a pessoa nem olhou,
nunca mais aparece na sessão. E o botão "Ir confirmar" navega para `/admin/dashboard`
**sem** passar o número do pedido (`?pedido=`), obrigando a digitar manualmente.

### 27. Exclusões sem tratamento de erro deixam a tela em estado falso

`handleDelete` de cupons, promoções, destaques e categorias usa `try { } finally { }`
**sem catch** (ex.: `cupons/page.hooks.ts:201-208`): se a API falhar, a promise rejeita
sem tratamento, o modal continua aberto sem mensagem. Em produtos, o catch fecha o modal
de confirmação **sem avisar** que nada foi excluído (`produtos/page.hooks.ts:274-275`).
`toggleActive` (cupons/promos/destaques) também não tem catch — o clique falha mudo.

### 28. Página de detalhe: N+1 requisições e kit ignora variantes

- Os "outros produtos da promoção" são buscados **um request por produto**
  (`produto/[id]/page.hooks.ts:135-139`) — promoção com 20 produtos = 20 chamadas.
- "Adicionar kit à sacola" adiciona os produtos **sem checar variantes obrigatórias**
  (`page.hooks.ts:300-309`), criando itens sem `variantId` que a sacola precifica pelo
  preço base — inconsistente com o botão normal, que bloqueia sem seleção.

### 29. Copiar link falha silenciosamente fora de HTTPS

`navigator.clipboard` é `undefined` em origens não seguras; `handleCopyLink`/`handleCopy`
não têm try/catch (`produto/[id]/page.hooks.ts:220-230`, `ProductCard.tsx:335-345`).
Em um deploy http (ou webview antiga), o clique gera exceção não tratada e nenhum feedback.

### 30. Contexto da sacola: efeitos colaterais dentro do setState e cupom volátil

`syncToServer`/analytics são chamados **dentro** do updater do `setCartItems`
(`bag-context.tsx:118-155`) — em dev (StrictMode) o updater roda 2× e duplica eventos de
analytics; é um padrão frágil. Além disso, o cupom aplicado vive só em memória: basta
recarregar a página ou navegar de novo para a loja para **o cupom sumir da sacola** sem aviso.

---

## ⚪ Menores

| # | Onde | Problema |
|---|------|----------|
| 31 | `admin/pedidos/page.hooks.ts:65` | `pendingCount` só atualiza na aba "Todos"; confirmar pedidos em outra aba deixa a contagem obsoleta. |
| 32 | `admin/login` | Usuário já logado que visita `/admin/login` não é redirecionado ao painel. |
| 33 | `admin/perfil/page.hooks.ts:72-74` | A pré-visualização da cor altera `--color-primary` global e **persiste mesmo sem salvar** (até recarregar). |
| 34 | `admin/layout.tsx:271-291` | Reenviar verificação de e-mail ignora `res.ok` — mostra "Link enviado!" mesmo com rate limit (2/min) recusando. |
| 35 | `sacola/page.hooks.ts:429` | `orderNumber = Date.now().slice(-6)` — colisão entre clientes faz o pedido falhar mudo (risco já documentado, agravado pelos itens 1/2). |
| 36 | `catalogService.getPublicProductsByIds` | IDs vão na query string sem `encodeURIComponent` (ok para cuid, frágil se o formato de ID mudar). |
| 37 | `SubscriptionBanner` (`admin/layout.tsx:231-235`) | Busca `billing/current` a **cada navegação** de página do admin. |
| 38 | `useAdminAuth.ts:18` | `atob` falha com payload JWT contendo caracteres não-ASCII (hoje não acontece, mas quebraria o login se o payload ganhar o nome da loja). |
| 39 | `dashboard/page.hooks.ts:65-79` | Busca automática via `?pedido=` usa `setTimeout(100)` e não mostra estado de carregamento. |
| 40 | `admin/cupons/page.hooks.ts:124` | Checagem de código duplicado só compara com os cupons carregados no cliente (a API cobre com 409, mas a mensagem local pode enganar). |
| 41 | `promocoes/page.hooks.ts:257-276` | Reordenar por drag-and-drop não trata erro: se o PUT falhar, a ordem visual fica diferente da salva. |
| 42 | `promocoes` (form) | Promoção "percentage" pode ser salva **sem** `discountPercent` (só valida `> 100`) — cria promoção que não desconta nada, só badge. |
| 43 | `loja/[slug]/page.hooks.ts:36-39` | Voltar/avançar do navegador com `?page=N` não sincroniza o estado `page` (o `router.replace` disfarça, mas deep-links com histórico podem divergir). |

---

## Temas transversais (raiz de vários bugs acima)

1. **Fire-and-forget sem observabilidade** — pedidos, notificações e analytics engolem
   erros. O caso dos pedidos (itens 1, 2, 4) mostra por que pelo menos o salvamento de
   pedido merece retry/aviso ("não foi possível registrar seu pedido").
2. **Contrato de preço divergente entre web e API** — o front trata desconto como
   agregado (`discount`), a API valida por item (`unitPrice` com cupom). Falta um teste
   de integração que monte o payload **exatamente como a sacola monta**.
3. **`null` vs `undefined` na atualização parcial** — o padrão
   `.transform(v => v || undefined)` + `JSON.stringify` torna impossível limpar campos.
4. **Data/hora sem fuso definido** — `toISOString()` (UTC) misturado com
   `toTimeString()` (local) em 6+ arquivos, dos dois lados.
5. **`buildDiff` compara formatos diferentes** — formulário sem `id`/campos derivados vs
   resposta da API; gera falsos positivos (variantes) e mascara mudanças reais.
6. **401 não tratado** — sessão expirada degrada o painel inteiro em erros genéricos.
