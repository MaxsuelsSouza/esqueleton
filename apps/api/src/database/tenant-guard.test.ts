// Testes da proteção de loja (tenant guard) — consultas sem storeId são bloqueadas
import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { comProtecaoDeLoja } from './tenant-guard'

// Banco falso mínimo: registra as chamadas e devolve respostas vazias
function criaFake() {
  const fake = {
    product: {
      findMany: vi.fn(async () => []),
      create: vi.fn(async () => ({})),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    coupon: {
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async () => ({})),
    },
    user: {
      findUnique: vi.fn(async () => null),
    },
    store: {
      findUnique: vi.fn(async () => null),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(fake)),
  }
  return fake
}

describe('comProtecaoDeLoja', () => {
  it('bloqueia leitura de modelo de loja sem storeId no where', async () => {
    const prisma = comProtecaoDeLoja(criaFake() as unknown as PrismaClient)

    await expect(prisma.product.findMany({})).rejects.toThrow(/storeId/)
    await expect(prisma.product.findMany()).rejects.toThrow(/storeId/)
  })

  it('permite leitura com storeId no where', async () => {
    const fake = criaFake()
    const prisma = comProtecaoDeLoja(fake as unknown as PrismaClient)

    await expect(prisma.product.findMany({ where: { storeId: 'loja-a' } })).resolves.toEqual([])
    expect(fake.product.findMany).toHaveBeenCalled()
  })

  it('aceita storeId dentro de chave composta (ex: storeId_code)', async () => {
    const prisma = comProtecaoDeLoja(criaFake() as unknown as PrismaClient)

    await expect(
      prisma.coupon.findUnique({ where: { storeId_code: { storeId: 'loja-a', code: 'X' } } })
    ).resolves.toBeNull()
  })

  it('bloqueia criação sem storeId em data', async () => {
    const prisma = comProtecaoDeLoja(criaFake() as unknown as PrismaClient)

    await expect(
      prisma.product.create({ data: { name: 'Produto', price: 10 } as never })
    ).rejects.toThrow(/storeId/)
  })

  it('bloqueia exclusão em massa sem storeId', async () => {
    const prisma = comProtecaoDeLoja(criaFake() as unknown as PrismaClient)

    await expect(prisma.product.deleteMany({})).rejects.toThrow(/storeId/)
  })

  it('bloqueia upsert sem storeId no create', async () => {
    const prisma = comProtecaoDeLoja(criaFake() as unknown as PrismaClient)

    await expect(
      prisma.coupon.upsert({
        where: { storeId_code: { storeId: 'loja-a', code: 'X' } },
        create: { code: 'X' } as never,
        update: {},
      })
    ).rejects.toThrow(/storeId/)
  })

  it('não exige storeId nos modelos globais (user e store)', async () => {
    const prisma = comProtecaoDeLoja(criaFake() as unknown as PrismaClient)

    await expect(prisma.user.findUnique({ where: { email: 'a@b.com' } })).resolves.toBeNull()
    await expect(prisma.store.findUnique({ where: { slug: 'loja-a' } })).resolves.toBeNull()
  })

  it('protege também o cliente dentro de transações com função', async () => {
    const fake = criaFake()
    const prisma = comProtecaoDeLoja(fake as unknown as PrismaClient)

    await expect(
      prisma.$transaction(async (tx) => tx.product.findMany({}))
    ).rejects.toThrow(/storeId/)
  })
})
