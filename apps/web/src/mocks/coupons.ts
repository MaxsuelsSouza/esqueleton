// Cupons de exemplo para desenvolvimento
import type { Coupon } from '@esqueleton/shared'

export const MOCK_COUPONS: Coupon[] = [
  {
    id: 'coupon-1',
    code: 'VERAO20',
    description: 'Desconto de verão para novos clientes',
    discountType: 'percentage',
    discountPercent: 20,
    minimumOrderValue: 100,
    maxUses: 200,
    usedCount: 47,
    maxUsesPerUser: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'coupon-2',
    code: 'FRETE50',
    description: 'R$ 50 de desconto acima de R$ 200',
    discountType: 'fixed',
    discountValue: 50,
    minimumOrderValue: 200,
    maxUses: undefined,
    usedCount: 12,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'coupon-3',
    code: 'VIP30',
    description: 'Cupom exclusivo para clientes VIP',
    discountType: 'percentage',
    discountPercent: 30,
    maxUses: 50,
    usedCount: 50,
    maxUsesPerUser: 1,
    active: false,
    createdAt: new Date().toISOString(),
  },
]
