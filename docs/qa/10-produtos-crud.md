# QA — CRUD de Produtos (Admin)

**Commits relacionados:** `ebd8824`, `fad4528`, `b7bfed1`, `ab0a04a`, `7cb8bdb`
**Data:** 2026-06-09 a 2026-06-23

## Descrição

Gestão completa de produtos no painel admin: criar, editar, listar, excluir. Inclui upload de foto (base64), categorias, variantes, características e toggle de disponibilidade.

## Pré-condições

- Logado como OWNER ou STAFF
- Loja com categorias já cadastradas (opcional)

## Casos de Teste

### CT-01: Criar produto
1. Acessar `/admin/produtos`
2. Clicar em "Novo produto"
3. Preencher: nome, marca, preço, descrição, imagem
4. **Esperado:** Produto criado. Aparece na lista. `storeId` atribuído automaticamente.

### CT-02: Editar produto
1. Clicar em um produto existente
2. Alterar nome e preço
3. Salvar
4. **Esperado:** Apenas campos alterados enviados na requisição. Produto atualizado.

### CT-03: Excluir produto
1. Clicar em excluir
2. Confirmar
3. **Esperado:** Produto removido (deleteMany com storeId). Desaparece da lista.

### CT-04: Upload de imagem
1. Fazer upload de foto (galeria ou câmera)
2. **Esperado:** Imagem convertida para base64. Validada por `imageUrlSchema` (~3MB max). Aceita http(s) URL ou data:image base64.

### CT-05: Imagem com URL inválida
1. Tentar salvar produto com imageUrl `javascript:alert(1)`
2. **Esperado:** Bloqueado por `imageUrlSchema`.

### CT-06: Associar categorias
1. Criar produto e associar a 2 categorias
2. **Esperado:** `ProductCategory` criado para cada associação.

### CT-07: Variantes do produto
1. Adicionar variantes (ex: tamanho P, M, G)
2. **Esperado:** Variantes salvas como JSON no produto.

### CT-08: Limite de plano (maxProducts)
1. Loja com plano que limita a 10 produtos
2. Tentar criar o 11º produto
3. **Esperado:** 403 — limite do plano atingido (`checkPlanLimit`).

### CT-09: Produto de outra loja
1. Tentar editar/excluir produto com ID de outra loja
2. **Esperado:** 404 (ownership pattern — storeId não bate).

## Validações de API

| Endpoint | Método | Auth | Rate Limit |
|----------|--------|------|------------|
| `GET /api/products` | GET | JWT | Global |
| `POST /api/products` | POST | JWT | Global + checkPlanLimit |
| `PUT /api/products/:id` | PUT | JWT | Global |
| `DELETE /api/products/:id` | DELETE | JWT | Global |

## Critérios de Aceite

- [ ] CRUD completo funciona
- [ ] Upload de imagem (base64) funciona
- [ ] URLs maliciosas são bloqueadas
- [ ] Limite de plano é respeitado
- [ ] Isolamento multi-tenant no CRUD
