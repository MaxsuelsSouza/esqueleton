// Normaliza um telefone para uso em links wa.me — remove formatação e
// garante o código do Brasil (55) na frente.
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) return digits
  return '55' + digits
}
