import { describe, it, expect } from 'vitest'
import type { FastifyRequest } from 'fastify'
import { resolveClientKey } from './client-ip'

// Monta um objeto mínimo parecido com o FastifyRequest só com o que a função usa
function fakeRequest(headers: Record<string, string | string[]>, ip = '9.9.9.9'): FastifyRequest {
  return { headers, ip } as unknown as FastifyRequest
}

describe('resolveClientKey', () => {
  it('prefere x-vercel-forwarded-for (definido pela plataforma)', () => {
    const request = fakeRequest({
      'x-vercel-forwarded-for': '203.0.113.10',
      'x-real-ip': '198.51.100.7',
      'x-forwarded-for': '1.2.3.4',
    })
    expect(resolveClientKey(request)).toBe('203.0.113.10')
  })

  it('usa x-real-ip quando não há cabeçalho da Vercel', () => {
    const request = fakeRequest({ 'x-real-ip': '198.51.100.7', 'x-forwarded-for': '1.2.3.4' })
    expect(resolveClientKey(request)).toBe('198.51.100.7')
  })

  it('cai para request.ip quando não há cabeçalhos confiáveis da plataforma', () => {
    const request = fakeRequest({ 'x-forwarded-for': '1.2.3.4' }, '10.0.0.1')
    expect(resolveClientKey(request)).toBe('10.0.0.1')
  })

  it('pega apenas o primeiro IP de uma lista separada por vírgula', () => {
    const request = fakeRequest({ 'x-vercel-forwarded-for': '203.0.113.10, 70.41.3.18, 150.172.238.178' })
    expect(resolveClientKey(request)).toBe('203.0.113.10')
  })

  it('ignora cabeçalho vazio e usa o próximo disponível', () => {
    const request = fakeRequest({ 'x-vercel-forwarded-for': '   ', 'x-real-ip': '198.51.100.7' })
    expect(resolveClientKey(request)).toBe('198.51.100.7')
  })
})
