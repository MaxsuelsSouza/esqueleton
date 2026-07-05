'use client'

// Página pública de uma promoção — exibe todos os produtos que participam dela
// Acessada pelo menu lateral do header (mobile) em /loja/[slug]/promocao/[id]
import Link from 'next/link'
import { ArrowLeft, Tag, PackageSearch } from 'lucide-react'
import { ProductCard } from '@/modules/catalog/components/ProductCard'
import { usePromocaoPage } from './page.hooks'

export default function PromocaoPage() {
  const { slug, promotion, promotedItems, isLoading, error } = usePromocaoPage()

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8">

        {/* Voltar para o catálogo */}
        <Link
          href={`/loja/${slug}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Voltar ao catálogo
        </Link>

        {/* Mensagem de erro (promoção inexistente ou falha de rede) */}
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Cabeçalho da promoção */}
        {promotion && (
          <div
            className="mb-6 rounded-2xl border bg-white p-5 sm:p-6"
            style={{ borderColor: promotion.color ?? 'var(--color-primary, #e5e7eb)' }}
          >
            <div className="flex items-center gap-2">
              <Tag size={20} style={{ color: promotion.color ?? 'var(--color-primary, #111827)' }} />
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{promotion.name}</h1>
            </div>
            {promotion.description && (
              <p className="mt-1.5 text-sm text-gray-500">{promotion.description}</p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              {isLoading
                ? 'Carregando produtos...'
                : `${promotedItems.length} produto${promotedItems.length !== 1 ? 's' : ''} nesta promoção`}
            </p>
          </div>
        )}

        {/* Esqueleto de carregamento */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white">
                <div className="aspect-square animate-pulse rounded-t-2xl bg-gray-200" />
                <div className="flex flex-col gap-2 p-3 sm:p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                  <div className="mt-1 h-8 w-full animate-pulse rounded-xl bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grade de produtos da promoção */}
        {!isLoading && !error && promotedItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {promotedItems.map((item) => (
              <ProductCard key={item.product.id} {...item} displayMode="grid" />
            ))}
          </div>
        )}

        {/* Nenhum produto na promoção */}
        {!isLoading && !error && promotedItems.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-gray-400">
            <PackageSearch size={48} strokeWidth={1.5} />
            <p className="text-lg font-medium">Nenhum produto nesta promoção</p>
            <p className="text-sm">Os produtos podem ter sido removidos do catálogo.</p>
          </div>
        )}
      </div>
    </main>
  )
}
