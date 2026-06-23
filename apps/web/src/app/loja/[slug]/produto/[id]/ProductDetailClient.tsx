'use client'

// Página de detalhe do produto — componente client com toda a interatividade
import { useRouter } from 'next/navigation'
import { ShoppingBag, Heart, Link, Check, ArrowLeft, PackageSearch, ChevronLeft, ChevronRight, X, User, Phone } from 'lucide-react'
import { ProductPrice } from '@/modules/catalog/components/ProductPrice'
import { ProductSuggestions } from '@/modules/catalog/components/ProductSuggestions'
import { useStoreSlug } from '@/shared/hooks/useStoreSlug'
import { useProdutoDetailPage } from './page.hooks'

export default function ProductDetailClient() {
  const {
    product,
    rawPrice,
    promoDiscountPercent,
    isLoading,
    copied,
    added,
    currentImageIndex,
    setCurrentImageIndex,
    selectedOptions,
    router,
    isFavorited,
    toggleFavorite,
    handleCopyLink,
    handleAddToBag,
    handleSelectOption,
    variantError,
    galleryImages,
    optionGroups,
    selectedVariant,
    hasPromo,
    displayPrice,
    suggestions,
    suggestionsLoading,
    handleBuyNow,
    identModalOpen,
    nameInput,
    setNameInput,
    phoneInput,
    setPhoneInput,
    identError,
    nameRef,
    handleIdentConfirm,
    closeIdentModal,
    handleModalBackdropClick,
  } = useProdutoDetailPage()

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
        {!isLoading && product && (<>
          <div className="grid gap-8 lg:grid-cols-2">

            {/* Coluna esquerda — galeria de fotos */}
            <div>
              {/* Imagem principal */}
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
                {galleryImages.length > 0 ? (
                  <>
                    <img
                      src={galleryImages[currentImageIndex] ?? galleryImages[0]}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                    {/* Setas de navegação */}
                    {galleryImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImageIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/60"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={() => setCurrentImageIndex((i) => (i + 1) % galleryImages.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/60"
                        >
                          <ChevronRight size={20} />
                        </button>
                        {/* Indicadores */}
                        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                          {galleryImages.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`h-2 w-2 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-200">
                    <ShoppingBag size={80} strokeWidth={1} />
                  </div>
                )}
              </div>

              {/* Miniaturas */}
              {galleryImages.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                        idx === currentImageIndex ? 'border-gray-900' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
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
                <ProductPrice
                  price={displayPrice}
                  size="lg"
                  originalPrice={hasPromo ? (selectedVariant ? selectedVariant.price : rawPrice ?? undefined) : undefined}
                  discountPercent={hasPromo ? promoDiscountPercent : undefined}
                />
              </div>

              {/* Seletor de variantes */}
              {optionGroups.length > 0 && (
                <div className="flex flex-col gap-4">
                  {optionGroups.map(({ name, values }) => (
                    <div key={name}>
                      <p className="mb-2 text-sm font-medium text-gray-700">
                        {name}{selectedOptions[name] ? `: ${selectedOptions[name]}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {values.map((value) => {
                          const isSelected = selectedOptions[name] === value
                          return (
                            <button
                              key={value}
                              onClick={() => handleSelectOption(name, value, isSelected)}
                              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                                isSelected
                                  ? 'border-gray-900 bg-gray-900 text-white'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                              }`}
                            >
                              {value}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Aviso quando faltam opções de variante */}
              {variantError && (
                <p className="text-sm text-red-500">{variantError}</p>
              )}

              {/* Botões de ação */}
              <div className="flex flex-col gap-3">

                {/* Adicionar à sacola e Comprar agora */}
                <div className="flex gap-3">
                  <button
                    onClick={handleAddToBag}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-95 ${
                      added
                        ? 'bg-green-600 text-white'
                        : 'bg-black text-white hover:bg-gray-800'
                    }`}
                  >
                    {added ? (
                      <><Check size={17} /> Adicionado!</>
                    ) : (
                      <><ShoppingBag size={17} /> Adicionar à sacola</>
                    )}
                  </button>

                  <button
                    onClick={handleBuyNow}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 py-3.5 text-sm font-semibold text-white transition-all hover:bg-green-600 active:scale-95"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[17px] w-[17px]">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Comprar agora
                  </button>
                </div>

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

              {/* Características */}
              {product.characteristics && product.characteristics.length > 0 && (
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-sm font-semibold text-gray-900">Características</h2>
                  <dl className="divide-y divide-gray-100">
                    {product.characteristics.map((char, index) => (
                      <div key={index} className="flex justify-between py-2 text-sm">
                        <dt className="text-gray-500">{char.name}</dt>
                        <dd className="font-medium text-gray-900">{char.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

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

          {/* Sugestões de produtos da mesma categoria */}
          <ProductSuggestions
            products={suggestions}
            isLoading={suggestionsLoading}
          />
        </>)}

      </div>

      {/* Modal de identificação do cliente */}
      {identModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={handleModalBackdropClick}
        >
          <div className="w-full max-w-sm overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">

            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Identificação</h2>
                <p className="text-xs text-gray-500">Seus dados serão enviados junto com a mensagem</p>
              </div>
              <button onClick={closeIdentModal} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4 px-5 py-5">

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User size={14} className="text-gray-400" />
                  Nome
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleIdentConfirm()}
                  placeholder="Seu nome completo"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-900"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Phone size={14} className="text-gray-400" />
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleIdentConfirm()}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-900"
                />
              </div>

              {identError && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{identError}</p>
              )}

              <button
                onClick={handleIdentConfirm}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-600 active:scale-[0.98]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Confirmar e enviar pelo WhatsApp
              </button>

            </div>
          </div>
        </div>
      )}

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
