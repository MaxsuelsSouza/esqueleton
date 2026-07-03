// ─────────────────────────────────────────────────────────────────────────────
// VALIDAÇÃO DOS COMMITS fd04d32 (zerar falhas da suíte) e eb7287e (fuso unificado)
//
// Duas garantias estruturais conferidas aqui:
//
// 1) tenant-guard: a violação de "consulta sem storeId" agora vira uma PROMISE
//    REJEITADA — e não um throw síncrono. Isso importa porque as rotas fazem
//    chamadas fire-and-forget com `.catch(() => {})`; um throw síncrono
//    derrubaria a rota, uma promise rejeitada é capturada pelo .catch.
//    (O guard continua bloqueando de verdade — só mudou COMO ele sinaliza.)
//
// 2) store-time: API e site calculam "hoje/agora" no MESMO fuso (America/Sao_Paulo),
//    independentemente de o servidor rodar em UTC. É isso que faz promoção, cupom
//    e destaque virarem o dia no mesmo instante nos dois lados.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest'
import { comProtecaoDeLoja } from '../../shared/database/tenant-guard'
import { getStoreDateTime, STORE_TIMEZONE } from '../../shared/datetime/store-time'
import type { PrismaClient } from '@prisma/client'

// Prisma falso onde toda operação "de sucesso" só devolve um marcador.
// O guard embrulha isto e intercepta antes de chegar aqui quando falta storeId.
function prismaFake(): PrismaClient {
  const model = {
    findMany: async () => 'OK',
    findUnique: async () => 'OK',
    create: async () => 'OK',
    createMany: async () => 'OK',
    update: async () => 'OK',
    delete: async () => 'OK',
    deleteMany: async () => 'OK',
    upsert: async () => 'OK',
    count: async () => 0,
  }
  return {
    product: { ...model },
    order: { ...model },
    coupon: { ...model },
    // user e store são isentos do guard (login por email global / tabela de lojas)
    user: { ...model },
    store: { ...model },
  } as unknown as PrismaClient
}

// ─────────────────────────────────────────────────────────────────────────────
describe('fd04d32 · tenant-guard sinaliza violação como PROMISE REJEITADA', () => {
  it('CENÁRIO: findMany sem storeId → promise rejeitada (não throw síncrono)', async () => {
    const prisma = comProtecaoDeLoja(prismaFake())

    // Se fosse throw síncrono, esta linha explodiria fora do await.
    // Como é promise rejeitada, a chamada retorna e o erro só aparece no await.
    const chamada = prisma.product.findMany({ where: {} })
    await expect(chamada).rejects.toThrow(/storeId/)
  })

  it('CENÁRIO CRÍTICO: fire-and-forget com .catch NÃO derruba a rota', async () => {
    const prisma = comProtecaoDeLoja(prismaFake())

    // Padrão real das rotas: notificação best-effort sem storeId.
    // O throw síncrono antigo escapava do .catch e quebrava a resposta.
    let capturado = false
    await prisma.order
      .create({ data: { total: 10 } as never }) // falta storeId em data
      .catch(() => {
        capturado = true
      })

    expect(capturado).toBe(true)
  })

  it('CENÁRIO: create sem storeId em data → rejeitado', async () => {
    const prisma = comProtecaoDeLoja(prismaFake())
    await expect(prisma.coupon.create({ data: { code: 'X' } as never })).rejects.toThrow(/storeId/)
  })

  it('CENÁRIO: consulta COM storeId passa direto pelo guard', async () => {
    const prisma = comProtecaoDeLoja(prismaFake())
    await expect(prisma.product.findMany({ where: { storeId: 'loja-1' } })).resolves.toBe('OK')
  })

  it('CENÁRIO: chave composta ({ storeId_code: { storeId, code } }) é reconhecida', async () => {
    const prisma = comProtecaoDeLoja(prismaFake())
    await expect(
      prisma.coupon.findUnique({ where: { storeId_code: { storeId: 'loja-1', code: 'PROMO' } } as never }),
    ).resolves.toBe('OK')
  })

  it('CENÁRIO: user e store são isentos — consultam sem storeId', async () => {
    const prisma = comProtecaoDeLoja(prismaFake())
    await expect(prisma.user.findUnique({ where: { email: 'a@b.com' } as never })).resolves.toBe('OK')
    await expect(prisma.store.findUnique({ where: { slug: 'loja-1' } as never })).resolves.toBe('OK')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('eb7287e · store-time — data/hora sempre no fuso da loja (America/Sao_Paulo)', () => {
  it('SANIDADE: o fuso de referência é America/Sao_Paulo', () => {
    expect(STORE_TIMEZONE).toBe('America/Sao_Paulo')
  })

  it('CENÁRIO: 02:00 UTC ainda é o dia ANTERIOR no Brasil (UTC-3)', () => {
    // 2026-07-03T02:00Z → em São Paulo são 23:00 do dia 02.
    // É o caso que fazia uma promoção "virar o dia" na hora errada.
    const { date, time } = getStoreDateTime(new Date('2026-07-03T02:00:00Z'))
    expect(date).toBe('2026-07-02')
    expect(time).toBe('23:00')
  })

  it('CENÁRIO: meio-dia UTC é 09:00 no Brasil, mesmo dia', () => {
    const { date, time } = getStoreDateTime(new Date('2026-07-03T12:00:00Z'))
    expect(date).toBe('2026-07-03')
    expect(time).toBe('09:00')
  })

  it('FORMATO: data em AAAA-MM-DD e hora em HH:mm (24h, com zero à esquerda)', () => {
    const { date, time } = getStoreDateTime(new Date('2026-01-05T13:05:00Z'))
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(time).toMatch(/^\d{2}:\d{2}$/)
    // 13:05 UTC → 10:05 em São Paulo
    expect(time).toBe('10:05')
  })

  it('CONSISTÊNCIA: a mesma instância de Date produz o mesmo resultado em qualquer chamada', () => {
    const instante = new Date('2026-03-10T23:30:00Z')
    expect(getStoreDateTime(instante)).toEqual(getStoreDateTime(instante))
  })
})
