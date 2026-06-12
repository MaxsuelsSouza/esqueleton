// Página de apresentação do SaaS — convence o lojista a criar sua vitrine online.
// Slug da loja demo: /loja/demo (precisa do seed com produtos reais)
import Link from 'next/link'

// O slug da loja de exemplo — aponta para a loja demo com produtos fictícios
const DEMO_SLUG = 'eletrc-store'

// ---------------------------------------------------------------------------
// Ícones inline (evita dependência de pacote extra nesta página estática)
// ---------------------------------------------------------------------------

function IconBarChart() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconWhatsapp() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function IconLink() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function IconPalette() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconArrowRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Dados das seções
// ---------------------------------------------------------------------------

const features = [
  {
    icon: <IconBarChart />,
    title: 'Saiba o que vende — e o que tá encalhado',
    description:
      'Veja seus produtos mais vendidos, os que ninguém olha e os que param no carrinho. Decida promoção com dado, não com achismo. Mesmo de casa.',
  },
  {
    icon: <IconWhatsapp />,
    title: 'O pedido chega pronto no seu WhatsApp',
    description:
      'Nada de "tem tal produto?". O cliente monta a sacola e você recebe a lista completa, com valores. Pagamento direto entre vocês, sem taxa nossa.',
  },
  {
    icon: <IconTag />,
    title: 'Promoção que você sabe se funcionou',
    description:
      'Crie cupons e descontos em 2 cliques — e depois veja quantas vendas cada um trouxe.',
  },
  {
    icon: <IconSearch />,
    title: 'Seu cliente acha tudo sozinho',
    description:
      'Busca por nome, filtro por preço e categoria. Menos pergunta no zap, mais pedido fechado.',
  },
  {
    icon: <IconLink />,
    title: 'Um link que é seu',
    description:
      'Cola na bio do Insta, no status, no grupo da família. Quem clica cai direto na sua loja.',
  },
  {
    icon: <IconPalette />,
    title: 'Com a sua cara',
    description:
      'Cores, destaque, organização — sua vitrine, suas regras. Personalize a loja do jeito que combina com a sua marca.',
  },
]

const steps = [
  {
    number: '1',
    title: 'Crie sua loja',
    description: 'Escolha o nome e o endereço da sua loja. É rápido — leva menos de um minuto.',
  },
  {
    number: '2',
    title: 'Cadastre seus produtos',
    description:
      'Adicione foto, nome, preço e categoria. Pode usar a câmera do celular para tirar a foto na hora.',
  },
  {
    number: '3',
    title: 'Compartilhe o link',
    description:
      'Manda no status, nos grupos, na bio do Insta. Os pedidos começam a cair no seu WhatsApp.',
  },
]

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ----------------------------------------------------------------- */}
      {/* Navegação                                                          */}
      {/* ----------------------------------------------------------------- */}
      <nav className="sticky top-0 z-30 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-900">
              <span className="text-xs font-bold text-white">E</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">Esqueleton</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/login"
              className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
            >
              Entrar
            </Link>
            <Link
              href="/admin/login"
              className="rounded-xl bg-gray-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
            >
              Criar loja
            </Link>
          </div>
        </div>
      </nav>

      {/* ----------------------------------------------------------------- */}
      {/* Hero — ataca o status quo (Instagram) e convida pra ver a demo     */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative overflow-hidden px-6 pb-20 pt-20 sm:pb-28 sm:pt-28">
        {/* Fundo decorativo */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gray-100 opacity-60 blur-3xl" />
        </div>

        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 inline-block rounded-full bg-gray-100 px-4 py-1.5 text-xs font-medium text-gray-600">
            Grátis. Sem taxa por venda. Sem cartão de crédito.
          </p>

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Sua loja merece mais<br className="hidden sm:block" /> que um feed do Instagram
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-gray-500 sm:text-lg">
            Vitrine com preço, foto e promoções num link só. O cliente escolhe,
            monta a sacola e o pedido cai pronto no seu WhatsApp — você só fecha a venda.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href={`/loja/${DEMO_SLUG}`}
              className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-gray-900/20 transition-all hover:bg-gray-700 hover:shadow-xl hover:shadow-gray-900/25"
            >
              Ver uma loja de exemplo
              <IconArrowRight />
            </Link>
            <Link
              href="/admin/login"
              className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
            >
              Criar minha loja grátis
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Anti-objeção: "mas eu já uso Instagram / WhatsApp"                 */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-gray-100 bg-gray-50 px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            &ldquo;Mas eu já vendo pelo Instagram...&rdquo;
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-relaxed text-gray-500 sm:text-base">
            A gente sabe. O Esqueleton não substitui seu Insta — ele resolve o que
            o Insta não faz:
          </p>

          <div className="mt-10 flex flex-col gap-6">
            {/* Comparação 1 */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
              <p className="text-sm leading-relaxed text-gray-700">
                <span className="font-semibold text-gray-900">No Instagram</span>, o cliente
                pergunta preço no direct e some.{' '}
                <span className="font-semibold text-gray-900">Aqui</span>, preço, foto e descrição
                já estão lá — ele chega no seu WhatsApp pronto pra fechar.
              </p>
            </div>

            {/* Comparação 2 */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
              <p className="text-sm leading-relaxed text-gray-700">
                <span className="font-semibold text-gray-900">No catálogo do WhatsApp</span>, tudo
                vira uma lista bagunçada.{' '}
                <span className="font-semibold text-gray-900">Aqui</span>, o cliente filtra por
                categoria, busca pelo nome e monta a sacola sozinho.
              </p>
            </div>

            {/* Comparação 3 */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
              <p className="text-sm leading-relaxed text-gray-700">
                <span className="font-semibold text-gray-900">Nas redes</span>, você não sabe o que
                funciona.{' '}
                <span className="font-semibold text-gray-900">Aqui</span>, você vê o que mais
                vende, o que tá parado e qual promoção trouxe gente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Funcionalidades — cada card responde "o que EU ganho?"             */}
      {/* ----------------------------------------------------------------- */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Feito pra loja de bairro, não pra e-commerce gigante
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-gray-500 sm:text-base">
              Sem complicação. Cadastre seus produtos, compartilhe o link e pronto.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-6 transition-shadow hover:shadow-lg hover:shadow-gray-200/60"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-gray-700">
                  {feature.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Como funciona — 3 passos                                           */}
      {/* ----------------------------------------------------------------- */}
      <section id="como-funciona" className="scroll-mt-20 border-t border-gray-100 bg-gray-50 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Pronto em 3 passos
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-gray-500 sm:text-base">
              Comece agora e tenha sua loja online funcionando em minutos.
            </p>
          </div>

          <div className="mt-14 flex flex-col gap-10">
            {steps.map((step) => (
              <div key={step.number} className="flex gap-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Redução de atrito */}
          <p className="mt-10 text-center text-sm text-gray-500">
            Não precisa de computador. Dá pra fazer tudo pelo celular, inclusive a foto dos produtos.
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Preço — transparência total                                        */}
      {/* ----------------------------------------------------------------- */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Grátis. De verdade.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
            Sem cartão, sem taxa por venda, sem prazo de teste. Quando lançarmos planos
            pagos, quem entrou agora será avisado antes — e o plano gratuito continua existindo.
          </p>

          <div className="mx-auto mt-10 max-w-sm">
            <ul className="flex flex-col gap-3 text-left">
              {[
                'Produtos ilimitados',
                'Categorias e subcategorias',
                'Promoções e cupons de desconto',
                'Pedidos via WhatsApp',
                'Painel administrativo completo',
                'Link exclusivo para sua loja',
                'Funciona em qualquer celular',
                'Seções de destaque na vitrine',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-gray-900">
                    <IconCheck />
                  </span>
                  <span className="text-sm text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* CTA final — última chance de matar objeção                         */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-gray-100 bg-gray-50 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Ainda na dúvida?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-gray-500 sm:text-base">
            Dá uma olhada na loja de exemplo e imagina ela com os seus produtos.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href={`/loja/${DEMO_SLUG}`}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-sm font-semibold text-gray-900 transition-all hover:border-gray-300 hover:shadow-md"
            >
              Ver loja de exemplo
              <IconArrowRight />
            </Link>
            <Link
              href="/admin/login"
              className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-gray-900/20 transition-all hover:bg-gray-700 hover:shadow-xl hover:shadow-gray-900/25"
            >
              Criar a minha grátis
              <IconArrowRight />
            </Link>
          </div>

          {/* Micro-segurança */}
          <p className="mt-6 text-xs text-gray-400">
            Leva menos de 1 minuto · Não pede cartão · Cancela quando quiser
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Rodapé                                                             */}
      {/* ----------------------------------------------------------------- */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center text-xs text-gray-400">
        <p>© {new Date().getFullYear()} Esqueleton. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
