// Validação de cupom — verifica se o cupom pode ser usado (ativo, dentro das datas, dentro do limite de usos)

import { getStoreDateTime } from '../../../shared/datetime/store-time'

type CouponRecord = {
  active: boolean
  startDate?: string | null
  endDate?: string | null
  maxUses: number | null
  usedCount: number
}

export function isCouponUsable(coupon: CouponRecord): { valid: boolean; reason?: string } {
  if (!coupon.active) {
    return { valid: false, reason: 'Este cupom não está disponível.' }
  }

  // Data no fuso da loja — o mesmo cálculo usado pelo site
  const { date: today } = getStoreDateTime()

  if (coupon.startDate && coupon.startDate > today) {
    return { valid: false, reason: 'Este cupom não está disponível.' }
  }

  if (coupon.endDate && coupon.endDate < today) {
    return { valid: false, reason: 'Este cupom está expirado.' }
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, reason: 'Este cupom atingiu o limite de usos.' }
  }

  return { valid: true }
}
