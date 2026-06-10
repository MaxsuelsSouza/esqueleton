import type { Promotion } from '@esqueleton/shared'
import { MOCK_PROMOTIONS } from './promotions'

let current: Promotion[] = [...MOCK_PROMOTIONS]

export function getMockPromotions(): Promotion[] { return current }
export function setMockPromotions(promotions: Promotion[]): void { current = promotions }
