import type { ProductVariant } from '@esqueleton/shared'

// Extrai os grupos de opções (ex: "Cor" → ["Branco", "Azul"]) das variantes ativas
export function getOptionGroups(variants: ProductVariant[]): { name: string; values: string[] }[] {
  const groups = new Map<string, Set<string>>()
  for (const variant of variants) {
    for (const [key, value] of Object.entries(variant.options)) {
      if (!groups.has(key)) groups.set(key, new Set())
      groups.get(key)!.add(value)
    }
  }
  return Array.from(groups.entries()).map(([name, values]) => ({
    name,
    values: Array.from(values),
  }))
}

// Encontra a variante que corresponde às opções selecionadas pelo cliente
export function findVariant(
  variants: ProductVariant[],
  selectedOptions: Record<string, string>,
): ProductVariant | undefined {
  const selectedKeys = Object.keys(selectedOptions)
  if (selectedKeys.length === 0) return undefined
  return variants.find((v) =>
    selectedKeys.every((key) => v.options[key] === selectedOptions[key]),
  )
}
