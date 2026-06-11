// Página inicial do sistema — apresentação simples do serviço de catálogos.
// Cada loja tem o seu próprio endereço em /loja/<endereço-da-loja>
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">

      {/* Marca */}
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900">
        <span className="text-base font-bold text-white">E</span>
      </div>

      {/* Chamada principal */}
      <h1 className="max-w-xl text-3xl font-bold text-gray-900 sm:text-4xl">
        Crie o catálogo da sua loja
      </h1>
      <p className="mt-3 max-w-md text-sm text-gray-500 sm:text-base">
        Monte a vitrine de produtos da sua loja, compartilhe o endereço com seus
        clientes e receba pedidos pelo WhatsApp.
      </p>

      {/* Ações */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          href="/admin/login"
          className="rounded-xl bg-gray-900 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
        >
          Criar minha loja
        </Link>
        <Link
          href="/admin/login"
          className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          Já tenho uma loja — entrar
        </Link>
      </div>

      <p className="mt-12 text-xs text-gray-400">
        Sua loja fica disponível em /loja/endereco-da-sua-loja
      </p>
    </main>
  )
}
