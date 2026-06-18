// Compara o payload atualizado com o objeto original e retorna apenas os campos que mudaram.
// Usado nos formulários de edição para enviar ao PUT somente o que foi alterado,
// evitando sobrescrever dados desnecessariamente.
export function buildDiff<T extends Record<string, unknown>>(
  original: Record<string, unknown>,
  updated: T,
): Partial<T> {
  const diff = {} as Partial<T>

  for (const key of Object.keys(updated) as Array<keyof T & string>) {
    const oldVal = original[key]
    const newVal = updated[key]

    // Trata null, undefined e string vazia como equivalentes ("sem valor")
    const oldEmpty = oldVal == null || oldVal === ''
    const newEmpty = newVal == null || newVal === ''
    if (oldEmpty && newEmpty) continue

    // Para arrays e objetos usa JSON.stringify; para primitivos a comparação direta basta
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = newVal
    }
  }

  return diff
}
