// Checagem de senhas fracas (LGPD, Fase 4.5) — bloqueia as senhas mais
// comuns em vazamentos, que são as primeiras tentadas em ataques de
// adivinhação. Lista local e enxuta: só entram senhas com 8+ caracteres
// (o mínimo já exigido), incluindo as favoritas no Brasil.

const SENHAS_MUITO_COMUNS = new Set([
  // Top mundial (8+ caracteres)
  'password',
  'password1',
  'password123',
  'passw0rd',
  'p@ssw0rd',
  '12345678',
  '123456789',
  '1234567890',
  '123123123',
  '11111111',
  '87654321',
  '987654321',
  'qwertyuiop',
  'qwerty123',
  'qwerty1234',
  '1q2w3e4r',
  '1q2w3e4r5t',
  'q1w2e3r4',
  'abcd1234',
  'abc12345',
  'a1b2c3d4',
  'asdfghjkl',
  'iloveyou',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'superman',
  'internet',
  'whatever',
  'trustno1',
  'letmein123',
  'welcome1',
  'welcome123',
  'admin123',
  'admin1234',
  'administrador',
  // Favoritas no Brasil
  'senha123',
  'senha1234',
  'senha12345',
  'minhasenha',
  'minhasenha1',
  'mudar123',
  '123mudar',
  'mudar@123',
  'brasil123',
  'brasilbrasil',
  '10203040',
  '102030405',
  'flamengo1',
  'corinthians',
  'palmeiras',
  'saopaulo1',
])

// Sequências longas de dígitos ("12345678", "9876543210"...) — cobre também
// variações que não estão na lista
const DIGITOS_CRESCENTES = '01234567890123456789'
const DIGITOS_DECRESCENTES = '98765432109876543210'

// Diz se a senha é comum demais para proteger uma conta.
// A comparação ignora maiúsculas — "Password123" é tão fraca quanto "password123".
export function isSenhaMuitoComum(password: string): boolean {
  const normalizada = password.toLowerCase()

  if (SENHAS_MUITO_COMUNS.has(normalizada)) return true

  // Um único caractere repetido (ex: "aaaaaaaa", "00000000")
  if (/^(.)\1+$/.test(normalizada)) return true

  // Apenas dígitos em sequência crescente ou decrescente
  if (/^\d+$/.test(normalizada)) {
    if (DIGITOS_CRESCENTES.includes(normalizada) || DIGITOS_DECRESCENTES.includes(normalizada)) {
      return true
    }
  }

  return false
}
