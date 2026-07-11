# Landing Page do SaaS

Pagina de apresentacao do Esqueleton — convence o lojista a criar sua vitrine online.

## Arquivo

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza a landing page estatica com secoes de marketing, features, passos e CTA |

## O que este arquivo faz

Esta e a pagina raiz (`/`) da aplicacao. E uma pagina estatica (sem `'use client'`, sem estado, sem efeitos) que apresenta o produto SaaS para potenciais clientes (lojistas).

A pagina e composta por estas secoes, nesta ordem:

1. **Navegacao (nav)** — barra fixa no topo com logo "Esqueleton", link "Entrar" e botao "Criar loja", ambos apontando para `/admin/login`.
2. **Hero** — titulo principal ("Sua loja merece mais que um feed do Instagram"), subtitulo explicativo e dois CTAs: "Ver uma loja de exemplo" (aponta para `/loja/eletrc-store`) e "Criar minha loja gratis".
3. **Anti-objecao** — secao "Mas eu ja vendo pelo Instagram..." com tres cards comparando Instagram/WhatsApp com a plataforma.
4. **Funcionalidades** — grade de 6 cards (analytics, WhatsApp, promocoes, busca, link proprio, personalizacao), cada um com icone SVG inline, titulo e descricao.
5. **Como funciona** — 3 passos numerados (Crie sua loja, Cadastre produtos, Compartilhe o link).
6. **Preco** — secao "Gratis. De verdade." com lista de 8 beneficios incluidos.
7. **CTA final** — convite para ver a loja demo ou criar a propria, com frase de reducao de atrito.
8. **Rodape** — copyright com ano dinamico.

## Componentes e providers utilizados

- **`Link`** (next/link) — navegacao interna para `/admin/login` e `/loja/<slug>`.
- **Icones SVG inline** — `IconBarChart`, `IconWhatsapp`, `IconTag`, `IconSearch`, `IconLink`, `IconPalette`, `IconCheck`, `IconArrowRight`. Sao funcoes locais que retornam SVGs para evitar dependencia de pacote de icones nesta pagina estatica.

Nao utiliza providers, hooks, contextos ou chamadas a API.

## Observacoes

- A constante `DEMO_SLUG` (`'eletrc-store'`) define o slug da loja de exemplo usada nos CTAs. Para funcionar, precisa existir uma loja com esse slug e produtos cadastrados no banco.
- A pagina e inteiramente estatica — nao usa `'use client'`, o que permite renderizacao no servidor sem JavaScript no cliente.
- Os textos de marketing sao em portugues coloquial, voltados para lojistas de bairro.
- A secao de preco menciona "Gratis" e "sem taxa por venda", mas o sistema ja possui billing com planos pagos (Stripe). O conteudo pode estar desatualizado em relacao a logica real de cobranca.
