// Shared types between API and Web
// Add domain types here as the project grows

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
}

export interface Product {
  id: string
  // Nome da marca (ex: Dior, Chanel, L'Occitane)
  brand?: string
  name: string
  description: string | null
  price: number
  // Preço original antes do desconto — quando informado, indica que o produto está em promoção
  originalPrice?: number
  imageUrl: string | null
  // Quantidade em estoque — null significa que o estoque não é controlado
  stock?: number | null
  // IDs das categorias às quais o produto pertence (pode ser mais de uma)
  categoryIds?: string[]
  createdAt: string
  updatedAt: string
}

// Versão enxuta do produto, usada nos seletores do admin (cupons, promoções, destaques).
// Não inclui a imagem nem a descrição — apenas o necessário para escolher produtos —
// para que a listagem não trafegue as fotos (que podem ser grandes) sem necessidade.
export interface ProductOption {
  id: string
  name: string
  brand?: string
  price: number
  categoryIds?: string[]
}

// Categoria do catálogo — pode ter subcategorias formando uma árvore de qualquer profundidade
export interface Category {
  id: string
  name: string
  // null indica categoria raiz (sem pai)
  parentId: string | null
  // Subcategorias — preenchidas quando os dados chegam em formato de árvore
  children?: Category[]
}

// Calcula a porcentagem de desconto de um produto em promoção
export function calcDiscount(price: number, originalPrice: number): number {
  return Math.round(((originalPrice - price) / originalPrice) * 100)
}

export interface User {
  id: string
  email: string
  createdAt: string
}

// Seção "Em destaque" exibida no topo do catálogo — apenas uma pode estar ativa por vez
export interface Featured {
  id: string
  // Título exibido na seção (ex: "Em destaque", "Ofertas da semana")
  title: string
  // Texto da tag no canto direito do cabeçalho (ex: "Destaque", "Oferta")
  tag: string
  // Produtos exibidos na seção
  productIds: string[]
  // Período de vigência — opcional
  startDate?: string
  endDate?: string
  // Janela de horário diária — opcional
  startTime?: string
  endTime?: string
  active: boolean
  createdAt: string
}

// Tipo de promoção — apenas um rótulo visual, não restringe os campos disponíveis
export type PromotionType = 'percentage' | 'fixed' | 'buy_x_get_y' | 'kit' | 'custom'

export interface Promotion {
  id: string
  name: string
  type: PromotionType
  // Desconto percentual (ex: 20 = 20% off)
  discountPercent?: number
  // Desconto em valor fixo (ex: 50 = R$ 50,00 off)
  discountValue?: number
  // Regra "compre X leve Y" (ex: compre 2 leve 3)
  buyQuantity?: number
  getQuantity?: number
  // Preço especial do kit
  kitPrice?: number
  // Produtos incluídos na promoção
  productIds: string[]
  // Janela de horário diária recorrente — ex: válido das 08:00 às 12:00
  startTime?: string
  endTime?: string
  // Período de vigência — ex: só em janeiro
  startDate?: string
  endDate?: string
  // Texto livre para descrever qualquer regra que não caiba nos campos acima
  description?: string
  // Cor da borda exibida ao redor do card do produto no catálogo (hex, ex: "#f97316")
  color?: string
  active: boolean
  createdAt: string
}

export interface Coupon {
  id: string
  // Código que o cliente digita no checkout (ex: VERAO20)
  code: string
  description?: string
  // Tipo de desconto
  discountType: 'percentage' | 'fixed'
  discountPercent?: number
  discountValue?: number
  // Valor mínimo do pedido para o cupom ser válido
  minimumOrderValue?: number
  // Limite total de usos — null significa ilimitado
  maxUses?: number
  usedCount: number
  // Limite de usos por pessoa
  maxUsesPerUser?: number
  // Se vazio, aplica a todos os produtos
  productIds?: string[]
  startDate?: string
  endDate?: string
  active: boolean
  createdAt: string
}

// Perfil da loja — dados públicos e configurações de aparência
export interface StoreProfile {
  id: string
  // Nome exibido no cabeçalho e em mensagens do WhatsApp
  storeName: string
  address?: string
  // Número no formato internacional sem espaços (ex: "5511999999999")
  whatsapp?: string
  // Arroba sem @ (ex: "minhaloja")
  instagram?: string
  // URL da logo exibida no cabeçalho
  logoUrl?: string
  // Cor principal do tema em hex (ex: "#e11d48") — usada nos botões e acentos do catálogo
  themeColor: string
  // Mensagens exibidas na barra acima do cabeçalho, uma por vez em rotação
  announcements: string[]
  updatedAt: string
}

// Item de um pedido — armazenado junto ao pedido para histórico independente do cadastro
export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  promotionName?: string
  originalPrice?: number
}

// Status do pedido
export type OrderStatus = 'PENDING' | 'SOLD' | 'NOT_SOLD'

// Pedido gerado no momento em que o cliente clica em "Enviar pelo WhatsApp"
export interface Order {
  id: string
  // Número de 6 dígitos exibido na mensagem do WhatsApp — usado para busca no dashboard
  orderNumber: string
  customerName?: string
  customerPhone?: string
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  couponCode?: string
  status: OrderStatus
  createdAt: string
  updatedAt: string
}

// Cliente identificado na sacola antes de enviar pelo WhatsApp
export interface Customer {
  id: string
  name: string
  phone: string
  createdAt: string
}

// Evento de produto registrado para analytics
export type ProductEventType =
  | 'CART_ADD'       // adicionado à sacola
  | 'WHATSAPP_SEND'  // pedido enviado pelo WhatsApp
  | 'LINK_COPY'      // link do produto copiado
  | 'PRODUCT_VIEW'   // página do produto aberta
  | 'FAVORITE_ADD'   // produto adicionado aos favoritos
  | 'FEATURED_CLICK' // produto clicado dentro de uma seção em destaque

// Métricas de um produto individual no dashboard de analytics
export interface ProductMetric {
  productId: string
  productName: string
  // Total de vezes adicionado à sacola
  cartAdds: number
  // Total de vezes enviado pelo WhatsApp
  whatsappSends: number
  // Pontuação total = cartAdds + whatsappSends
  totalPoints: number
  // Quantidade de vezes que o link do produto foi copiado
  linkCopies: number
  // Quantidade de vezes que a página do produto foi aberta
  views: number
  // Quantidade de vezes que o produto foi adicionado aos favoritos
  favorites: number
  // Vendas confirmadas pelo conferente no dashboard — chega a 100% quando todos são SOLD
  confirmedSales: number
  // Pedidos aguardando confirmação no dashboard
  pendingOrders: number
  // Percentual de conversão: confirmedSales / whatsappSends × 100
  conversionRate: number
  // Desempenho por promoção ativa no momento do evento
  promotions: Array<{
    promotionId: string
    promotionName: string
    cartAdds: number
    whatsappSends: number
  }>
  withCoupon: { cartAdds: number; whatsappSends: number }
  withoutCoupon: { cartAdds: number; whatsappSends: number }
}

// Métricas de uma promoção — agrega o desempenho de todos os produtos que participaram dela
export interface PromotionMetric {
  promotionId: string
  promotionName: string
  // Quantas vezes produtos com essa promoção foram adicionados à sacola
  cartAdds: number
  // Quantas vezes produtos com essa promoção foram enviados pelo WhatsApp
  whatsappSends: number
  // Vendas confirmadas em pedidos que continham um produto com essa promoção
  confirmedSales: number
  // Percentual de conversão: confirmedSales / whatsappSends × 100
  conversionRate: number
}

// Métricas de um cupom — mostra quantas vezes foi usado e o resultado das vendas
export interface CouponMetric {
  couponCode: string
  // Total de pedidos que usaram o cupom
  totalOrders: number
  // Pedidos confirmados como vendidos
  soldOrders: number
  // Pedidos aguardando confirmação
  pendingOrders: number
  // Pedidos marcados como não vendidos
  notSoldOrders: number
  // Percentual de conversão: soldOrders / totalOrders × 100
  conversionRate: number
}

// Métricas de uma seção em destaque — mostra engajamento e vendas originadas do destaque
export interface FeaturedMetric {
  featuredId: string
  featuredName: string
  // Quantas vezes um produto do destaque foi clicado (navegou para detalhe)
  clicks: number
  // Quantas vezes um produto do destaque foi adicionado à sacola diretamente
  cartAdds: number
  // Quantas vezes um produto do destaque foi enviado pelo WhatsApp
  whatsappSends: number
}

// Resumo completo de analytics retornado pelo endpoint GET /api/analytics/summary
export interface AnalyticsSummary {
  topProducts: ProductMetric[]
  bottomProducts: ProductMetric[]
  // Produtos adicionados à sacola mas que nunca foram enviados pelo WhatsApp
  cartOnlyProducts: ProductMetric[]
  // Produtos que chegaram até o envio pelo WhatsApp
  convertedProducts: ProductMetric[]
  // Produtos mais visualizados na página de detalhe
  mostViewedProducts: ProductMetric[]
  // Produtos mais favoritados
  mostFavoritedProducts: ProductMetric[]
  totalCartAdds: number
  totalWhatsappSends: number
  totalLinkCopies: number
  totalViews: number
  totalFavorites: number
  totalOrders: number
  totalPendingOrders: number
  totalSoldOrders: number
  totalNotSoldOrders: number
  // Percentual de conversão geral: vendas confirmadas / enviados ao WhatsApp
  overallConversionRate: number
  withCoupon: { cartAdds: number; whatsappSends: number }
  withoutCoupon: { cartAdds: number; whatsappSends: number }
  inPromotion: { cartAdds: number; whatsappSends: number }
  originalPrice: { cartAdds: number; whatsappSends: number }
  // Métricas por promoção
  promotionMetrics: PromotionMetric[]
  // Métricas por cupom
  couponMetrics: CouponMetric[]
  // Métricas por seção em destaque
  featuredMetrics: FeaturedMetric[]
}

// Tipos de notificação do painel administrativo
export type NotificationType =
  | 'NEW_ORDER'        // novo pedido recebido pelo WhatsApp
  | 'LOW_STOCK'        // estoque abaixo de 3 unidades
  | 'OUT_OF_STOCK'     // produto esgotado
  | 'PROMOTION_ENDED'  // promoção expirou
  | 'COUPON_ENDED'     // cupom expirou ou atingiu limite de usos
  | 'FEATURED_ENDED'   // seção em destaque expirou

export type NotificationStatus = 'PENDING' | 'READ'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body?: string
  // ID do recurso relacionado (pedido, produto, promoção, cupom ou destaque)
  entityId?: string
  status: NotificationStatus
  // Dados extras em JSON — ex: { customerPhone, customerName, total } para NEW_ORDER
  metadata?: string
  createdAt: string
}

// Modo de exibição dos produtos na listagem
export type DisplayMode = 'grid' | 'list'

// Estado dos filtros aplicados no catálogo
export interface CatalogFilters {
  searchTerm: string
  categories: string[]
  priceMin: number | null
  priceMax: number | null
  sortBy: 'newest' | 'price-asc' | 'price-desc'
}
