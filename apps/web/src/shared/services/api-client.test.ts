// Testes do cliente HTTP base — cabeçalhos de autenticação e tratamento de erros
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from './api-client'

// Substitui o fetch real por um falso que registra como foi chamado
const fetchFake = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchFake)
  fetchFake.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// Resposta falsa de sucesso com corpo JSON
function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: async () => body,
  }
}

describe('apiClient', () => {
  it('GET sem token não envia cabeçalho Authorization', async () => {
    fetchFake.mockResolvedValue(jsonResponse({ data: [] }))

    await apiClient.get('/products')

    const [, options] = fetchFake.mock.calls[0]
    expect(options.headers.Authorization).toBeUndefined()
  })

  it('GET com token envia o cabeçalho Authorization', async () => {
    fetchFake.mockResolvedValue(jsonResponse([]))

    await apiClient.get('/coupons', 'meu-token')

    const [, options] = fetchFake.mock.calls[0]
    expect(options.headers.Authorization).toBe('Bearer meu-token')
  })

  it('POST envia o corpo em JSON e o token quando informado', async () => {
    fetchFake.mockResolvedValue(jsonResponse({ id: '1' }, 201))

    await apiClient.post('/products', { name: 'Produto' }, 'meu-token')

    const [url, options] = fetchFake.mock.calls[0]
    expect(String(url)).toContain('/api/products')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ name: 'Produto' })
    expect(options.headers.Authorization).toBe('Bearer meu-token')
  })

  it('lança erro com a mensagem retornada pela API quando a resposta falha', async () => {
    fetchFake.mockResolvedValue(jsonResponse({ message: 'Cupom não encontrado.' }, 404))

    await expect(apiClient.get('/coupons/codigo/NAOEXISTE')).rejects.toThrow('Cupom não encontrado.')
  })

  it('usa o status HTTP como mensagem quando a API não retorna corpo', async () => {
    fetchFake.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => { throw new Error('sem corpo') },
    })

    await expect(apiClient.get('/products')).rejects.toThrow('500 Internal Server Error')
  })

  it('DELETE com resposta 204 (sem corpo) não tenta ler JSON', async () => {
    fetchFake.mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
      json: async () => { throw new Error('204 não tem corpo') },
    })

    await expect(apiClient.delete('/products/p1', 'meu-token')).resolves.toBeUndefined()
  })

  it('DELETE sem corpo não envia Content-Type (evita erro de JSON vazio no Fastify)', async () => {
    fetchFake.mockResolvedValue({ ok: true, status: 204, statusText: 'No Content', json: async () => null })

    await apiClient.delete('/promotions/p1', 'meu-token')

    const [, options] = fetchFake.mock.calls[0]
    expect(options.body).toBeUndefined()
    expect(options.headers['Content-Type']).toBeUndefined()
    expect(options.headers.Authorization).toBe('Bearer meu-token')
  })

  it('DELETE com corpo envia Content-Type application/json', async () => {
    fetchFake.mockResolvedValue({ ok: true, status: 204, statusText: 'No Content', json: async () => null })

    await apiClient.delete('/users/u1', 'meu-token', { password: 'segredo' })

    const [, options] = fetchFake.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({ password: 'segredo' })
    expect(options.headers['Content-Type']).toBe('application/json')
  })
})
