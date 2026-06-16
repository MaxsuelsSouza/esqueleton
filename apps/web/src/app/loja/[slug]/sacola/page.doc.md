# Sacola de Compras

Pagina da sacola que exibe os itens adicionados, permite aplicar cupom de desconto, identificar o cliente e enviar o pedido pelo WhatsApp.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza a lista de itens (com selecao individual, quantidade, preco e badge de promocao), campo de cupom, resumo de valores, identificacao do cliente e botao de envio pelo WhatsApp. Inclui modal de identificacao. |
| `page.hooks.ts` | Combina itens da sacola (Redis) com dados de produtos (API) e promocoes, gerencia selecao de itens, calcula totais (subtotal, desconto de promocoes, desconto de cupom, total), monta mensagem formatada do WhatsApp, salva pedido e registra analytics. Exporta `itemKey` e `formatCurrency`. |

## Fluxo de dados

`useBag()` fornece itens do carrinho (IDs + quantidades, persistidos no servidor Redis) → `catalogService.getPublicProductsByIds(slug, ids)` + `promotionsService.listPublicPromotions(slug)` buscam dados completos e promocoes → `applyPromotionsToProducts` aplica descontos → `items` (tipo `FullBagItem[]`) combina tudo com preco efetivo por variante → cupom aplicado via `useBag()` calcula `selectedDiscount` → ao enviar, `ordersService.create` salva o pedido, `analyticsService.recordEvent` registra eventos e `customersService.upsert` salva o cliente.

## Estados gerenciados

| Estado | Tipo | Descricao |
|--------|------|-----------|
| `productMap` | `Map<string, ProductWithPromo>` | Mapa de produtos com dados de promocao aplicada |
| `isLoadingProducts` | `boolean` | Carregamento dos dados de produtos |
| `selectedKeys` | `Set<string>` | Chaves dos itens selecionados para envio |
| `identModalOpen` | `boolean` | Modal de identificacao do cliente aberto |
| `nameInput` | `string` | Nome digitado no modal |
| `phoneInput` | `string` | Telefone digitado no modal |
| `identError` | `string \| null` | Erro de validacao no modal |

Estados herdados de `useBag()`:
| Estado | Tipo | Descricao |
|--------|------|-----------|
| `cartItems` | array | Itens crus do carrinho (productId, quantity, variantId, selectedOptions) |
| `totalItems` | `number` | Total de itens na sacola |
| `appliedCoupon` | `Coupon \| null` | Cupom aplicado |
| `couponInput` | `string` | Texto digitado no campo de cupom |
| `couponError` | `string` | Erro ao aplicar cupom |

## Acoes do usuario

| Acao | Handler | O que faz |
|------|---------|-----------|
| Selecionar/desmarcar item | `toggleSelect` | Alterna selecao de um item para envio |
| Selecionar/desmarcar todos | `toggleSelectAll` | Marca ou desmarca todos os itens |
| Alterar quantidade (+/-) | `updateQuantity` | Atualiza quantidade do item na sacola (Redis) |
| Remover item (lixeira) | `removeItem` | Remove o item da sacola |
| Limpar sacola | `clear` | Remove todos os itens |
| Digitar e aplicar cupom | `applyCoupon` | Valida cupom no servidor e aplica desconto |
| Remover cupom | `removeCoupon` | Remove o cupom aplicado |
| Clicar "Enviar pedido pelo WhatsApp" | `handleSendWhatsApp` | Se cliente ja identificado, abre WhatsApp direto; senao, abre modal de identificacao |
| Confirmar identificacao no modal | `handleIdentConfirm` | Valida nome e telefone, salva cliente, abre WhatsApp com mensagem formatada |
| Alterar dados do cliente | `openIdentModalForEdit` | Abre modal pre-preenchido com dados atuais |

## Modulos utilizados

- `@/shared/hooks/useStoreSlug` — extrai o slug da URL
- `@/modules/bag/contexts/bag-context` — `useBag` (itens, cupom, quantidade)
- `@/modules/customers/contexts/customer-context` — `useCustomer` (dados do cliente)
- `@/modules/store-profile/contexts/store-profile-context` — `useStoreProfile` (numero de WhatsApp da loja)
- `@/modules/catalog/services/catalog.service` — `getPublicProductsByIds`
- `@/modules/promotions/services/promotions.service` — `listPublicPromotions`
- `@/modules/promotions/utils/promotions` — `applyPromotionsToProducts`
- `@/modules/orders/services/orders.service` — `create` (salva pedido no banco)
- `@/modules/analytics/services/analytics.service` — `recordEvent` (WHATSAPP_SEND)
- `@/modules/customers/services/customers.service` — `upsert` (salva cliente)

## Observacoes

- Os itens da sacola sao armazenados no servidor (Redis) com apenas IDs e quantidades; os dados completos dos produtos sao buscados ao abrir a pagina.
- Itens do mesmo produto com variantes diferentes sao tratados como itens distintos (chave = `productId + opcoes`).
- O preco de variantes com promocao e calculado proporcionalmente: `variant.price * (product.price / rawPrice)`.
- O pedido e salvo no banco da loja e eventos de analytics sao registrados em modo fire-and-forget.
- O `orderNumber` e gerado no cliente com os ultimos 6 digitos do timestamp.
- A mensagem do WhatsApp inclui detalhes formatados: produtos, quantidades, precos, promocoes, cupom e total.
- O cupom valida elegibilidade por produto (`productIds`) e aplica desconto percentual ou fixo.
