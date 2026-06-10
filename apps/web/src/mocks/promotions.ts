// Promoções de exemplo para desenvolvimento
import type { Promotion } from '@esqueleton/shared'

export const MOCK_PROMOTIONS: Promotion[] = [
  {
    id: 'promo-1',
    name: 'Happy Hour de Perfumes',
    type: 'percentage',
    discountPercent: 20,
    productIds: ['1', '2', '3', '5'],
    startTime: '16:00',
    endTime: '20:00',
    description: 'Desconto válido todos os dias no horário do happy hour.',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'promo-2',
    name: 'Compre 2 Leve 3 — Linha Banho',
    type: 'buy_x_get_y',
    buyQuantity: 2,
    getQuantity: 3,
    productIds: ['21', '22', '23', '24'],
    description: 'O produto de menor valor sai de graça ao adicionar 3 itens da linha de banho.',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'promo-3',
    name: 'Kit Presente de Verão',
    type: 'kit',
    kitPrice: 199.9,
    productIds: ['7', '14', '22'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: 'Kit especial com 3 produtos por um preço único. Embalagem presente inclusa.',
    active: true,
    createdAt: new Date().toISOString(),
  },
]
