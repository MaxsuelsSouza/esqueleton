# QA — Perfil da Loja

**Commits relacionados:** `65e68d5`, `852dd82`, `7cb8bdb`
**Data:** 2026-06-14, 2026-06-17, 2026-06-23

## Descrição

Cada loja tem um perfil (StoreProfile) com logo, nome, descrição, WhatsApp, cores do tema e links sociais. O WhatsApp é obrigatório no cadastro e atualização. O logo é cacheado no localStorage para evitar flash visual.

## Casos de Teste

### CT-01: Visualizar perfil da loja
1. Acessar `/loja/<slug>`
2. **Esperado:** Header exibe logo, nome da loja e cores do tema.

### CT-02: Atualizar perfil (OWNER)
1. Logar como OWNER
2. Acessar configurações do perfil
3. Alterar nome, descrição, cores
4. **Esperado:** Alterações salvas. Apenas campos alterados enviados na requisição (PATCH behavior).

### CT-03: WhatsApp obrigatório
1. Tentar salvar perfil sem WhatsApp
2. **Esperado:** Erro de validação — WhatsApp é obrigatório.

### CT-04: Upload de logo (base64)
1. Fazer upload de imagem como logo
2. **Esperado:** Imagem convertida para base64 e salva (até ~3MB). `imageUrlSchema` valida.

### CT-05: Cache do logo no localStorage
1. Acessar uma loja
2. Recarregar a página
3. **Esperado:** Logo aparece imediatamente (sem flash de "Minha Loja"). Cache lido do localStorage.

### CT-06: STAFF não pode alterar perfil
1. Logar como STAFF
2. `PUT /api/store-profile`
3. **Esperado:** 403 Forbidden.

### CT-07: Cor nullable
1. Salvar perfil sem definir cor
2. **Esperado:** Campo `color` aceita null sem erro (fix `7cb8bdb`).

## Critérios de Aceite

- [ ] WhatsApp é obrigatório no cadastro e atualização
- [ ] Apenas campos alterados são enviados
- [ ] Logo cacheado no localStorage
- [ ] Apenas OWNER pode alterar perfil
- [ ] Cores nullable funcionam
