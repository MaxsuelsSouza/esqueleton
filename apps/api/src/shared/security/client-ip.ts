// Descobre quem é o cliente para efeito de limite de requisições (rate limit)
// de um jeito que resiste a falsificação de cabeçalhos.
//
// Por quê: com `trustProxy: true` (veja app.ts), o Fastify confia no cabeçalho
// `x-forwarded-for` para descobrir o IP real do cliente. O problema é que esse
// cabeçalho PODE ser forjado por quem consegue falar direto com a origem (sem
// passar pela Vercel/nginx) — bastaria mandar um `x-forwarded-for` diferente a
// cada tentativa para furar o limite por IP (CVE-2026-3635).
//
// Mitigação: preferir cabeçalhos que a própria plataforma define e reescreve, e
// que o cliente não consegue forjar quando o tráfego passa pelo proxy:
//   1. `x-vercel-forwarded-for` — definido pela Vercel com o IP real do cliente.
//   2. `x-real-ip` — definido pela Vercel/nginx, também com o IP real.
//   3. `request.ip` (deriva do `x-forwarded-for`) — último recurso, usado só em
//      dev/VPS ou quando os cabeçalhos da plataforma não estão presentes.

import type { FastifyRequest } from 'fastify'

// Um cabeçalho pode vir repetido (array) ou como lista separada por vírgula
// (ex.: "cliente, proxy1, proxy2") — pegamos sempre o primeiro valor, que é o
// IP do cliente mais próximo da origem definido pela plataforma.
function primeiroValor(header: string | string[] | undefined): string | undefined {
  if (!header) return undefined
  const bruto = Array.isArray(header) ? header[0] : header
  const primeiro = bruto.split(',')[0]?.trim()
  return primeiro || undefined
}

// Retorna a chave de rate limit para a requisição. Use esta função no lugar do
// `request.ip` padrão sempre que o limite precisar resistir a spoofing.
export function resolveClientKey(request: FastifyRequest): string {
  const headers = request.headers
  return (
    primeiroValor(headers['x-vercel-forwarded-for']) ??
    primeiroValor(headers['x-real-ip']) ??
    request.ip
  )
}
