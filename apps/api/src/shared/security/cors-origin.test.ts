import { describe, it, expect, vi } from 'vitest'
import { createCorsOrigin } from './cors-origin'

// Executa a função de origem e devolve o `allow` passado ao callback
function checar(
  resolver: ReturnType<typeof createCorsOrigin>,
  origin: string | undefined,
): boolean | undefined {
  if (typeof resolver !== 'function') {
    throw new Error('resolver não é uma função de origem (liberou tudo?)')
  }
  const callback = vi.fn()
  resolver(origin, callback)
  return callback.mock.calls[0]?.[1]
}

describe('createCorsOrigin', () => {
  it('libera qualquer origem quando CORS_ORIGIN não está definido', () => {
    expect(createCorsOrigin(undefined)).toBe(true)
    expect(createCorsOrigin('')).toBe(true)
    expect(createCorsOrigin('*')).toBe(true)
  })

  it('libera o domínio raiz configurado', () => {
    const resolver = createCorsOrigin('https://plataforma.com')
    expect(checar(resolver, 'https://plataforma.com')).toBe(true)
  })

  it('libera subdomínios de loja do domínio raiz', () => {
    const resolver = createCorsOrigin('https://plataforma.com')
    expect(checar(resolver, 'https://loja1.plataforma.com')).toBe(true)
    expect(checar(resolver, 'https://www.plataforma.com')).toBe(true)
  })

  it('bloqueia domínios de fora da lista', () => {
    const resolver = createCorsOrigin('https://plataforma.com')
    expect(checar(resolver, 'https://site-malicioso.com')).toBe(false)
    // não pode casar por sufixo enganoso
    expect(checar(resolver, 'https://outraplataforma.com')).toBe(false)
    expect(checar(resolver, 'https://plataforma.com.evil.com')).toBe(false)
  })

  it('aceita CORS_ORIGIN sem protocolo (só o domínio)', () => {
    const resolver = createCorsOrigin('plataforma.com')
    expect(checar(resolver, 'https://loja1.plataforma.com')).toBe(true)
    expect(checar(resolver, 'https://plataforma.com')).toBe(true)
  })

  it('suporta vários domínios separados por vírgula', () => {
    const resolver = createCorsOrigin('plataforma.com, outra-marca.com')
    expect(checar(resolver, 'https://loja1.plataforma.com')).toBe(true)
    expect(checar(resolver, 'https://app.outra-marca.com')).toBe(true)
    expect(checar(resolver, 'https://terceiro.com')).toBe(false)
  })

  it('permite requisições sem cabeçalho Origin (server-to-server, curl)', () => {
    const resolver = createCorsOrigin('https://plataforma.com')
    expect(checar(resolver, undefined)).toBe(true)
  })
})
