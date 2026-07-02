import { describe, it, expect } from 'vitest'
import { buildR2Key, storeIdFromR2Key, buildR2Prefix, buildStorePrefix } from './r2-key'

describe('buildR2Key', () => {
  it('gera key com formato {storeId}/{entityType}/{entityId}/{uuid}.{ext}', () => {
    const key = buildR2Key('store-abc', 'products', 'prod-123', 'webp')

    const parts = key.split('/')
    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('store-abc')
    expect(parts[1]).toBe('products')
    expect(parts[2]).toBe('prod-123')
    expect(parts[3]).toMatch(/^[a-f0-9]+\.webp$/)
  })

  it('normaliza a extensão para minúsculas e remove ponto inicial', () => {
    const key = buildR2Key('s1', 'products', 'p1', '.PNG')
    expect(key).toMatch(/\.png$/)
  })

  it('gera keys únicas a cada chamada', () => {
    const key1 = buildR2Key('s1', 'products', 'p1', 'webp')
    const key2 = buildR2Key('s1', 'products', 'p1', 'webp')
    expect(key1).not.toBe(key2)
  })
})

describe('storeIdFromR2Key', () => {
  it('extrai o storeId do início da key', () => {
    expect(storeIdFromR2Key('store-abc/products/prod-123/file.webp')).toBe('store-abc')
  })

  it('retorna null para key sem barra', () => {
    expect(storeIdFromR2Key('invalid')).toBeNull()
  })
})

describe('buildR2Prefix', () => {
  it('gera prefixo para uma entidade', () => {
    expect(buildR2Prefix('s1', 'products', 'p1')).toBe('s1/products/p1/')
  })
})

describe('buildStorePrefix', () => {
  it('gera prefixo para toda a loja', () => {
    expect(buildStorePrefix('s1')).toBe('s1/')
  })
})
