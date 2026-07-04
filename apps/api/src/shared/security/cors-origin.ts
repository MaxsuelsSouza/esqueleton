// Decide quais origens (sites) podem chamar a API pelo navegador (CORS).
//
// Por quê uma função em vez de uma origem fixa: a plataforma é multi-tenant e
// cada loja pode ser acessada por um subdomínio próprio (loja1.plataforma.com,
// loja2.plataforma.com...) além do domínio raiz. Uma única origem no CORS_ORIGIN
// (ex.: "https://plataforma.com") faria o navegador bloquear TODOS os subdomínios
// de loja, porque o @fastify/cors só libera a origem exata configurada.
//
// Aqui liberamos o domínio raiz E todos os seus subdomínios. O CORS_ORIGIN pode
// listar vários domínios separados por vírgula (ex.: "plataforma.com, outra.com").

import type { FastifyCorsOptions } from '@fastify/cors'

// Assinatura do callback esperada pelo @fastify/cors (allow é obrigatório)
type OriginCallback = (err: Error | null, allow: boolean) => void

// Extrai o hostname de uma entrada que pode vir como "https://dominio.com",
// "dominio.com" ou "dominio.com:3000". Retorna null se não for válida.
function hostnameDe(entrada: string): string | null {
  const limpo = entrada.trim()
  if (!limpo) return null
  try {
    // A URL exige um protocolo; adicionamos um quando a entrada vem só como domínio
    const url = new URL(limpo.includes('://') ? limpo : `https://${limpo}`)
    return url.hostname.toLowerCase()
  } catch {
    return null
  }
}

// Verdadeiro quando `host` é igual ao domínio base ou um subdomínio dele.
// Ex.: base "plataforma.com" casa com "plataforma.com", "www.plataforma.com"
// e "loja1.plataforma.com" — mas não com "outraplataforma.com".
function ehDominioOuSubdominio(host: string, base: string): boolean {
  return host === base || host.endsWith(`.${base}`)
}

// Monta o valor de `origin` para o @fastify/cors a partir do CORS_ORIGIN.
//
// - Sem CORS_ORIGIN (ou "*"): libera qualquer origem (uso em dev). O app.ts
//   já registra um aviso no log quando isso acontece.
// - Com CORS_ORIGIN: libera cada domínio listado e seus subdomínios.
//
// Origens não permitidas NÃO lançam erro — apenas não recebem o cabeçalho
// Access-Control-Allow-Origin (o navegador bloqueia). Lançar erro viraria um
// 500 no servidor em vez de um bloqueio limpo de CORS.
export function createCorsOrigin(corsOriginEnv: string | undefined): FastifyCorsOptions['origin'] {
  if (!corsOriginEnv || corsOriginEnv.trim() === '*') {
    // `true` faz o @fastify/cors refletir a origem da requisição
    return true
  }

  const basesPermitidas = corsOriginEnv
    .split(',')
    .map(hostnameDe)
    .filter((host): host is string => host !== null)

  return (origin: string | undefined, callback: OriginCallback) => {
    // Requisições sem cabeçalho Origin (server-to-server, curl, health check)
    // não são feitas por um navegador — não há o que bloquear.
    if (!origin) return callback(null, true)

    const host = hostnameDe(origin)
    const permitido =
      host !== null && basesPermitidas.some((base) => ehDominioOuSubdominio(host, base))

    callback(null, permitido)
  }
}
