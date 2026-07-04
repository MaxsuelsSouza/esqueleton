# 11 — Catálogo WhatsApp (Meta)

[← Voltar ao início](00-inicio.md)

## O que é

Cada loja pode sincronizar seus produtos com o **catálogo do WhatsApp Business** (Meta). Assim, os produtos aparecem na vitrine do WhatsApp da loja, e o checkout continua acontecendo no site (com preços corretos).

## Credenciais (no `StoreProfile`)

| Campo | O quê |
|-------|-------|
| `metaAccessToken` | token de acesso da Meta — **write-only** |
| `metaCatalogId` | ID do catálogo |
| `metaWabaId` | ID da conta WhatsApp Business |
| `whatsappCatalogEnabled` | liga/desliga a sincronização |

### Segurança do token

- **Write-only:** leituras do admin retornam `hasMetaAccessToken: boolean` no lugar do valor — o token **nunca volta** pela API (qualquer STAFF pode ler o perfil).
- Enviar `null`/`''` **limpa** a credencial; **omitir** o campo deixa intacto.
- A rota pública do perfil usa **allowlist** (`CAMPOS_PUBLICOS`) — campos sensíveis novos ficam privados por padrão.
- Risco aceito: o token fica em **plaintext no banco** (mitigado por write-only + OWNER-only). Alternativa documentada: AES-GCM com chave de env. Ver [Segurança](13-seguranca.md).

## Sincronização automática

O CRUD de produto dispara `syncProductToWhatsApp` / `removeProductFromWhatsApp` — **fire-and-forget**, apenas quando `whatsappCatalogEnabled` e as credenciais existem.

- Produtos **sem imagem http(s) pública** são pulados (a Meta exige `image_url` — base64 não serve).
- O adapter (`domain/catalog/integrations/whatsapp-catalog.adapter.ts`) usa o endpoint **`/batch`** da Meta com método **`UPDATE`** (upsert — `CREATE` falha em retailer_id existente).
- Erros de `validation_status` **por item** são tratados como falha — um HTTP 200 sozinho não significa sucesso.

## Rotas (todas OWNER-only)

| Rota | Rate limit | O quê |
|------|-----------|-------|
| `POST /api/store-profile/whatsapp-test` | 5/min | testa as credenciais |
| `GET /api/store-profile/whatsapp-status` | 30/min | status da integração |
| `POST /api/store-profile/whatsapp-sync` | 2/min | sincronização manual (exige toggle ligado) |

## Decisões de design (riscos aceitos)

- A sincronização envia o **preço base** do produto — promoções, cupons e preços por variante **não** vão para a Meta. Decisão: o catálogo WhatsApp é vitrine; o checkout acontece no site com os preços certos.
- O `/batch` da Meta é **assíncrono** — mesmo contando erros de `validation_status`, um item pode falhar depois no lado da Meta. Os contadores de sync são *best-effort*.

## Próxima página

→ [12 — Frontend Web](12-frontend-web.md)
