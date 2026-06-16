export { promotionsService } from './services/promotions.service'
export {
  isPromotionActive,
  getActivePromotionForProduct,
  applyPromotionToProduct,
  applyPromotionsToProducts,
} from './utils/promotions'
export type { PromotedProduct } from './utils/promotions'
