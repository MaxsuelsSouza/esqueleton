import type { Category } from '@esqueleton/shared'
import { MOCK_CATEGORIES } from './categories'
import { flattenCategories } from '@/utils/categories'

let current: Category[] = flattenCategories(MOCK_CATEGORIES)

export function getMockCategories(): Category[] { return current }
export function setMockCategories(categories: Category[]): void { current = categories }
