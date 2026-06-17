# shared/validation/ — Validadores Zod reutilizáveis

Schemas Zod compartilhados por toda a API. Toda validação de entrada deve usar estes validadores como base.

## Arquivos

### `schemas.ts`

**Exporta:**

| Validador | O que valida | Exemplo válido |
|-----------|-------------|----------------|
| `idSchema` | ID alfanumérico, 1–64 chars | `"abc123"`, `"prod_01"` |
| `idParamSchema` | Objeto `{ id }` para route params | `{ id: "abc123" }` |
| `idListSchema` | Array de IDs, máximo 500 | `["id1", "id2"]` |
| `dateSchema` | Data no formato AAAA-MM-DD | `"2026-06-16"` |
| `timeSchema` | Horário 24h no formato HH:MM | `"14:30"` |
| `hexColorSchema` | Cor hexadecimal | `"#f97316"`, `"#fff"` |
| `httpUrlSchema` | URL http(s), máximo 2048 chars | `"https://site.com/img.png"` |
| `imageUrlSchema` | URL http(s) OU base64 data URI, máximo ~3 MB | `"data:image/png;base64,..."` |
| `slugSchema` | Slug de loja, 3–40 chars, letras/números/hífen | `"perfumaria-ana"` |
| `slugParamSchema` | Objeto `{ slug }` para route params | `{ slug: "minha-loja" }` |
| `phoneSchema` | Telefone, 8–30 chars | `"(11) 99999-0000"` |
| `shortText(max, msg?)` | Texto curto com trim e tamanho máximo | `shortText(200, 'Nome é obrigatório')` |

## Como usar

```typescript
import { idParamSchema, shortText, imageUrlSchema } from '../../shared/validation/schemas'

// Em uma rota — validar params
const { id } = idParamSchema.parse(request.params)

// Em um schema de feature
export const meuSchema = z.object({
  name: shortText(200, 'Nome é obrigatório'),
  imageUrl: imageUrlSchema.or(z.literal('')).optional(),
})
```

## Regras

- Todas as mensagens de erro são em **português**.
- `imageUrlSchema` bloqueia `javascript:` e data URIs que não sejam imagem.
- `slugSchema` rejeita palavras reservadas: `admin`, `api`, `www`, `app`, `login`, `cadastro`, `loja`, `lojas`, `sacola`, `favoritos`, `produto`, `produtos`, `ajuda`, `suporte`.
- IDs aceitam letras, números, `_` e `-` (regex: `/^[A-Za-z0-9_-]+$/`).
- `shortText` sem `requiredMessage` permite string vazia (campo opcional).
