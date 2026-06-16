import type { Product } from '@esqueleton/shared'

let current: Product[] = []

export function getMockProducts(): Product[] { return current }
export function setMockProducts(products: Product[]): void { current = products }
