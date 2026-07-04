# 10 — Imagens (Cloudflare R2)

[← Voltar ao início](00-inicio.md)

## Visão geral

Fotos de produto e logos de loja são armazenados no **Cloudflare R2** (S3-compatible, via `@aws-sdk/client-s3`). O sistema foi desenhado para **dev funcionar sem R2** (base64 inline no banco) e **produção exigir R2** (a API se recusa a subir sem credenciais).

## Validação de entrada

Campos de imagem (`Product.imageUrl`, `StoreProfile.logoUrl`) usam `imageUrlSchema` (`shared/validation/schemas.ts`):

- Aceita URL `http(s)://` **ou** upload `data:image/...;base64,...` (o uploader do admin produz base64);
- Cap de **~3 MB**;
- Bloqueia `javascript:` e data URIs que não sejam de imagem;
- O `bodyLimit` do Fastify é elevado a **5 MB** para o base64 não estourar o limite padrão de 1 MB.

## Chaves com isolamento por tenant

O padrão da chave espelha o tenant guard do banco:

```
{storeId}/{entityType}/{entityId}/{uuid}.{ext}
```

Funções em `shared/storage/r2-key.ts`.

## Componentes

| Arquivo | Papel |
|---------|-------|
| `shared/storage/r2.plugin.ts` | decora `app.storage: StorageService \| null` — `upload(key, buffer, contentType)`, `delete(key)`, `deleteByPrefix(prefix)` |
| `shared/storage/image-upload.service.ts` | `uploadImage()` / `uploadImages()` — a lógica de decisão (abaixo) |
| `scripts/migrate-images-to-r2.mjs` | migração de base64 legado para R2 |

## Lógica de decisão do upload

| Entrada | Storage | Resultado |
|---------|---------|-----------|
| URL http(s) | qualquer | passa direto (pass-through) |
| base64 | R2 configurado | sobe para o R2 e retorna a URL pública |
| base64 | `null` (só dev) | retorna o base64 como está (fica no banco) |
| base64 | falha de upload | **lança erro** — nunca há fallback silencioso |

## Integração nas rotas

- **Produto POST/PUT** e **store-profile PUT** chamam `uploadImage`/`uploadImages` antes de salvar no banco.
- **Produto DELETE** dispara `deleteByPrefix` (fire-and-forget) para limpar os objetos do produto no R2.

## Migração de dados legados

`scripts/migrate-images-to-r2.mjs` lê imagens base64 do banco, sobe para o R2 e substitui os valores por URLs. **Idempotente** (pula URLs http) e suporta `--dry-run`.

## Variáveis de ambiente (obrigatórias em produção)

| Variável | O quê |
|----------|-------|
| `R2_ACCOUNT_ID` | ID da conta Cloudflare |
| `R2_ACCESS_KEY_ID` | access key do token de API R2 |
| `R2_SECRET_ACCESS_KEY` | secret do token |
| `R2_BUCKET_NAME` | nome do bucket (ex.: `esqueleton-images`) |
| `R2_PUBLIC_URL` | prefixo público do bucket (ex.: `https://img.esqueleton.com.br`) |

## Próxima página

→ [11 — Catálogo WhatsApp (Meta)](11-whatsapp-catalog.md)
