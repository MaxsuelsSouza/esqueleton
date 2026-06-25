// Skeleton exibido imediatamente ao navegar para o detalhe do produto,
// enquanto o Next.js resolve o Server Component (generateMetadata + fetch)
export default function ProductDetailLoading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8">

        {/* Botão voltar (placeholder) */}
        <div className="mb-6 h-5 w-36 animate-pulse rounded bg-gray-200" />

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Imagem */}
          <div className="aspect-square animate-pulse rounded-2xl bg-gray-200" />

          {/* Informações */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="h-8 w-3/4 animate-pulse rounded-lg bg-gray-200" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="h-24 animate-pulse rounded-xl bg-gray-200" />
            <div className="flex flex-col gap-3">
              <div className="h-12 animate-pulse rounded-xl bg-gray-200" />
              <div className="flex gap-3">
                <div className="h-12 flex-1 animate-pulse rounded-xl bg-gray-200" />
                <div className="h-12 flex-1 animate-pulse rounded-xl bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
