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

// Diz se um valor (ex: Armazenamento "500GB") pode ser escolhido considerando o que
// já está selecionado. Existe pelo menos uma variante ativa com esse valor que também
// combina com as demais opções já escolhidas? Sem isso, o cliente conseguiria montar
// combinações inexistentes (ex: Cor Laranja + 500GB) e travar no carrinho.
export function isOptionAvailable(
  variants: ProductVariant[],
  selectedOptions: Record<string, string>,
  groupName: string,
  value: string,
): boolean {
  return variants.some((variant) => {
    if (!variant.active) return false
    if (variant.options[groupName] !== value) return false
    // Precisa casar com todas as OUTRAS opções já escolhidas
    return Object.entries(selectedOptions).every(
      ([key, selectedValue]) => key === groupName || variant.options[key] === selectedValue,
    )
  })
}

// Ao escolher um valor, mantém apenas as demais seleções que continuam compatíveis com
// ele. Ex: com "Laranja + 250GB" selecionado, ao trocar a cor para "Azul" (que não tem
// 250GB), o 250GB é descartado — evitando ficar preso numa combinação impossível.
export function reconcileSelection(
  variants: ProductVariant[],
  selectedOptions: Record<string, string>,
  changedKey: string,
): Record<string, string> {
  const changedValue = selectedOptions[changedKey]
  const result: Record<string, string> = { [changedKey]: changedValue }
  for (const [key, value] of Object.entries(selectedOptions)) {
    if (key === changedKey) continue
    const stillCompatible = variants.some(
      (v) => v.active && v.options[changedKey] === changedValue && v.options[key] === value,
    )
    if (stillCompatible) result[key] = value
  }
  return result
}
