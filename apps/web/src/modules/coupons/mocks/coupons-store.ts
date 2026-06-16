import type { Coupon } from '@esqueleton/shared'
import { MOCK_COUPONS } from './coupons'

let current: Coupon[] = [...MOCK_COUPONS]

export function getMockCoupons(): Coupon[] { return current }
export function setMockCoupons(coupons: Coupon[]): void { current = coupons }
