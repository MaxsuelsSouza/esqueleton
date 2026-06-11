'use client'

// Página de detalhe do produto
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ShoppingBag, Heart, Link, Check, ArrowLeft, PackageSearch } from 'lucide-react'
import { catalogService } from '@/services/catalog.service'
import { MOCK_PRODUCTS } from '@/mocks/products'
import { MOCK_PROMOTIONS } from '@/mocks/promotions'
import { getActivePromotionForProduct, applyPromotionToProduct } from '@/utils/promotions'
import { ProductPrice } from '@/components/catalog/ProductPrice'
import { useBag } from '@/contexts/bag-context'
import { useFavorites } from '@/contexts/favorites-context'
import { analyticsService } from '@/services/analytics.service'
import { useStoreSlug } from '@/hooks/useStoreSlug'
import type { Product } from '@esqueleton/shared'

// Troque para false quando a API estiver pronta
const USE_MOCK_DATA = false

// Chave usada no localStorage para guardar quais produtos foram vistos e em qual data
const STORAGE_KEY = 'esqueleton_produtos_vistos'

// Retorna true se o produto já foi visto hoje neste navegador
function jaViuHoje(productId: string): boolean {
  try {
    const hoje = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
    const registros: Record<string, string> = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return registros[productId] === hoje
  } catch {
    return false
  }
}

// Salva a data de hoje para o produto, para não contar novamente no mesmo dia
function marcarComoVisto(productId: string): void {
  try {
    const hoje = new Date().toISOString().slice(0, 10)
    const registros: Record<string, string> = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    registros[productId] = hoje
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registros))
  } catch {
    // localStorage pode estar bloqueado em alguns navegadores — ignora silenciosamente
  }
}

export default function ProductDetailPage() {
  // slug identifica a loja visitada; id identifica o produto
  const { slug, id } = useParams<{ slug: string; id: string }>()
  const router = useRouter()
  const { addItem } = useBag()
  const { isFavorited, toggleFavorite } = useFavorites()

  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (USE_MOCK_DATA) {
      const found = MOCK_PRODUCTS.find((p) => p.id === id) ?? null
      if (found) {
        // Aplica promoção ativa ao produto, se houver
        const promo = getActivePromotionForProduct(found.id, MOCK_PROMOTIONS)
        setProduct(promo ? applyPromotionToProduct(found, promo).product : found)
      } else {
        setProduct(null)
      }
      setIsLoading(false)
      return
    }

    // cancelled evita duplo registro no StrictMode (React monta o componente duas vezes em desenvolvimento)
    let cancelled = false

    catalogService
      .getPublicProduct(slug, id)
      .then((p) => {
        setProduct(p)
        // Registra a visualização apenas se este efeito ainda for o atual
        // e se o produto ainda não foi visto hoje (evita contar múltiplas vezes no mesmo dia)
        if (!cancelled && !jaViuHoje(p.id)) {
          marcarComoVisto(p.id)
          analyticsService.recordEvent(slug, {
            productId: p.id,
            productName: p.brand ? `${p.brand} ${p.name}` : p.name,
            eventType: 'PRODUCT_VIEW',
          })
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setIsLoading(false))

    return () => { cancelled = true }
  }, [slug, id])

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href)

    // Registra o evento de cópia de link para analytics (fire-and-forget)
    if (product) {
      analyticsService.recordEvent(slug, { productId: product.id, productName: product.name, eventType: 'LINK_COPY' })
    }

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }


  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8">

        {/* Botão voltar */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Voltar ao catálogo
        </button>

        {/* Estado de carregamento */}
        {isLoading && <ProductDetailSkeleton />}

        {/* Produto não encontrado */}
        {!isLoading && !product && <ProductNotFound />}

        {/* Conteúdo do produto */}
        {!isLoading && product && (
          <div className="grid gap-8 lg:grid-cols-2">

            {/* Coluna esquerda — imagem */}
            <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-200">
                  <ShoppingBag size={80} strokeWidth={1} />
                </div>
              )}
            </div>

            {/* Coluna direita — informações */}
            <div className="flex flex-col gap-6">

              {/* Marca e nome */}
              <div>
                {product.brand && (
                  <p className="text-sm font-medium uppercase tracking-widest text-gray-400">
                    {product.brand}
                  </p>
                )}
                <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
                  {product.name}
                </h1>
              </div>

              {/* Preço */}
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <ProductPrice price={product.price} originalPrice={product.originalPrice} size="lg" />
                {/* Aviso de estoque baixo — exibido apenas quando restam menos de 6 unidades */}
                {product.stock != null && product.stock < 6 && (
                  <p className={`mt-2 text-sm font-semibold ${product.stock === 0 ? 'text-red-500' : 'text-orange-500'}`}>
                    {product.stock === 0
                      ? 'Produto esgotado'
                      : `Restam apenas ${product.stock} ${product.stock === 1 ? 'unidade' : 'unidades'}`}
                  </p>
                )}
              </div>

              {/* Botões de ação */}
              <div className="flex flex-col gap-3">

                {/* Adicionar à sacola — desabilitado quando esgotado */}
                <button
                  onClick={() => {
                    if (!product || product.stock === 0) return
                    addItem(product)
                    setAdded(true)
                    setTimeout(() => setAdded(false), 1500)
                  }}
                  disabled={product.stock === 0}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-95 ${
                    product.stock === 0
                      ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                      : added
                      ? 'bg-green-600 text-white'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {product.stock === 0 ? (
                    <><ShoppingBag size={17} /> Esgotado</>
                  ) : added ? (
                    <><Check size={17} /> Adicionado!</>
                  ) : (
                    <><ShoppingBag size={17} /> Adicionar à sacola</>
                  )}
                </button>

                {/* Favoritar e copiar link */}
                <div className="flex gap-3">
                  {product && (() => {
                    const fav = isFavorited(product.id)
                    return (
                      <button
                        onClick={() => toggleFavorite(product)}
                        aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all active:scale-95 ${
                          fav
                            ? 'border-red-200 bg-red-50 text-red-500'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        <Heart size={16} fill={fav ? 'currentColor' : 'none'} />
                        {fav ? 'Favoritado' : 'Favoritar'}
                      </button>
                    )
                  })()}

                  <button
                    onClick={handleCopyLink}
                    aria-label="Copiar link"
                    title={copied ? 'Link copiado!' : 'Copiar link'}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all active:scale-95 ${
                      copied
                        ? 'border-green-200 bg-green-50 text-green-600'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {copied ? <Check size={16} /> : <Link size={16} />}
                    {copied ? 'Link copiado!' : 'Copiar link'}
                  </button>
                </div>
              </div>

              {/* Descrição */}
              {product.description && (
                <p className="leading-relaxed text-gray-500">{product.description}</p>
              )}

              {/* Data de cadastro */}
              <p className="text-xs text-gray-400">
                Cadastrado em{' '}
                {new Date(product.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>

            </div>
          </div>
        )}

      </div>
    </main>
  )
}

// Esqueleto de carregamento
function ProductDetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="aspect-square animate-pulse rounded-2xl bg-gray-200" />
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
  )
}

// Produto não encontrado
function ProductNotFound() {
  const router = useRouter()
  const slug = useStoreSlug()
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-gray-400">
      <PackageSearch size={48} strokeWidth={1.5} />
      <p className="text-lg font-medium text-gray-600">Produto não encontrado</p>
      <p className="text-sm">Este produto não existe ou foi removido.</p>
      <button
        onClick={() => router.push(`/loja/${slug}`)}
        className="mt-2 rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        Voltar ao catálogo
      </button>
    </div>
  )
}
