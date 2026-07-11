# 01 — Visão Geral

[← Voltar ao início](00-inicio.md)

## O que é o Esqueleton

O Esqueleton é uma **plataforma SaaS multi-tenant** para criação de catálogos e vitrines online. Várias lojas compartilham o mesmo banco de dados e a mesma API — cada uma identificada por um `slug` único, com dados totalmente isolados.

**O que ele é:** vitrine de produtos, catálogo online, loja simples com pedido via WhatsApp.

**O que ele não é:** e-commerce com pagamento integrado no checkout do cliente final, marketplace, sistema de alto tráfego.

## Quem usa o sistema (atores)

| Ator | O que faz | Onde |
|------|-----------|------|
| **Cliente final** | Navega no catálogo, monta a sacola, envia pedido pelo WhatsApp | `/loja/{slug}` ou `{slug}.plataforma.com` |
| **Lojista OWNER** | Gerencia tudo da loja: produtos, promoções, equipe, assinatura | `/admin` |
| **Membro STAFF** | Gerencia o dia a dia (produtos, pedidos), sem acesso a equipe/perfil/billing | `/admin` |
| **Super Admin** | Opera a plataforma: lojas, planos, métricas, MRR | `/admin/super/*` |

## Jornada do lojista

1. **Cadastro** — em `/admin/login`, modo "Criar minha loja": informa nome da loja, slug (com sugestão automática), e-mail e senha. Uma transação única cria `Store` + `StoreProfile` + primeiro `User` (role `OWNER`).
2. **Trial** — a loja nasce com **7 dias de teste grátis**, contados de `Store.createdAt`. Nenhuma assinatura é criada no cadastro — o trial é implícito.
3. **Montagem do catálogo** — cadastra categorias (árvore de qualquer profundidade), produtos (com foto, marca, variantes, características), promoções, cupons e destaques.
4. **Divulgação** — compartilha o link da loja. O catálogo público funciona por path (`/loja/meu-slug`) e por subdomínio (`meu-slug.plataforma.com`).
5. **Assinatura** — ao fim do trial, o catálogo público para de responder (erro 503 genérico — ver [Billing](08-billing.md)). O painel admin **continua acessível** para o lojista assinar um plano via Stripe.

## Jornada do cliente final

1. Acessa o catálogo da loja e navega com **busca, filtros por categoria/preço e ordenação**.
2. Vê preços já com **promoções aplicadas**; pode digitar um **código de cupom** validado no servidor.
3. Adiciona produtos à **sacola** e pode **favoritar** itens.
4. Finaliza enviando o pedido pelo **WhatsApp** — o pedido é registrado no sistema (com validação de preços no servidor) e a conversa continua com o lojista.

## Princípios de design do projeto

- **Legibilidade para não-programadores** — nomes de arquivos, comentários e mensagens de erro em português claro (ex.: `"Nome é obrigatório"`).
- **Dev sem dependências externas** — sem API keys, tudo degrada graciosamente: e-mails viram logs, imagens ficam em base64, billing vira no-op.
- **Segurança server-side sempre** — o frontend esconde botões por conveniência, mas toda regra é imposta pela API (roles, preços, limites de plano).
- **Isolamento explícito** — o tenant guard obriga cada query a declarar o `storeId`; nada é injetado "por mágica" (ver [Multi-tenancy](03-multi-tenancy.md)).

## Próxima página

→ [02 — Arquitetura](02-arquitetura.md)
