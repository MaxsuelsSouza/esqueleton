// Testes do ciclo de lojas inativas (LGPD, Fase 3.5):
// aviso por e-mail → 30 dias → exclusão; reativação cancela o aviso.
import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { processarLojasInativas } from './inactive-stores.service'

// Banco falso mínimo — cada teste programa as respostas do store.findMany na
// ordem em que o serviço chama: 1ª = lojas para excluir, 2ª = lojas para avisar
function createFakes() {
  const store = {
    findMany: vi.fn().mockResolvedValue([]),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    delete: vi.fn().mockResolvedValue({}),
  }
  const prisma = { store } as unknown as PrismaClient
  const deps = {
    enviarAvisoDeExclusao: vi.fn().mockResolvedValue(undefined),
    cancelarAssinatura: vi.fn().mockResolvedValue(true),
    apagarImagensDaLoja: vi.fn(),
  }
  return { prisma, store, deps }
}

describe('processarLojasInativas', () => {
  it('avisa o dono da loja recém-inativa e carimba a data do aviso', async () => {
    // Arrange — nada para excluir; uma loja suspensa sem aviso ainda
    const { prisma, store, deps } = createFakes()
    store.findMany
      .mockResolvedValueOnce([]) // lojas para excluir
      .mockResolvedValueOnce([
        { id: 'loja-1', name: 'Perfumaria Ana', users: [{ email: 'ana@teste.com' }] },
      ]) // lojas para avisar

    // Act
    const resultado = await processarLojasInativas(prisma, deps)

    // Assert — e-mail enviado ao dono e carimbo gravado
    expect(deps.enviarAvisoDeExclusao).toHaveBeenCalledWith('ana@teste.com', 'Perfumaria Ana')
    expect(store.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'loja-1' },
        data: { deletionWarnedAt: expect.any(Date) },
      }),
    )
    expect(resultado.lojasAvisadas).toBe(1)
    expect(resultado.lojasExcluidas).toBe(0)
  })

  it('exclui a loja avisada há mais de 30 dias, cancelando cobrança e limpando imagens', async () => {
    // Arrange — uma loja suspensa com aviso vencido e assinatura ainda cobrando
    const { prisma, store, deps } = createFakes()
    store.findMany
      .mockResolvedValueOnce([
        {
          id: 'loja-2',
          name: 'Loja Abandonada',
          subscriptions: [{ stripeSubscriptionId: 'sub_stripe_123' }],
        },
      ]) // lojas para excluir
      .mockResolvedValueOnce([]) // lojas para avisar

    // Act
    const resultado = await processarLojasInativas(prisma, deps)

    // Assert — cancela no Stripe ANTES de apagar, depois exclui e limpa o R2
    expect(deps.cancelarAssinatura).toHaveBeenCalledWith('sub_stripe_123')
    expect(store.delete).toHaveBeenCalledWith({ where: { id: 'loja-2' } })
    expect(deps.apagarImagensDaLoja).toHaveBeenCalledWith('loja-2')
    expect(resultado.lojasExcluidas).toBe(1)
    // Nenhum aviso novo enviado
    expect(deps.enviarAvisoDeExclusao).not.toHaveBeenCalled()
  })

  it('limpa o aviso de lojas que voltaram à atividade', async () => {
    // Arrange — nenhuma loja inativa; duas lojas reativadas com aviso pendente
    const { prisma, store, deps } = createFakes()
    store.updateMany.mockResolvedValueOnce({ count: 2 }) // reset dos avisos

    // Act
    const resultado = await processarLojasInativas(prisma, deps)

    // Assert — o reset filtra por aviso preenchido E loja fora do critério de inatividade
    expect(store.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletionWarnedAt: { not: null } }),
        data: { deletionWarnedAt: null },
      }),
    )
    expect(resultado.avisosCancelados).toBe(2)
    expect(deps.enviarAvisoDeExclusao).not.toHaveBeenCalled()
    expect(store.delete).not.toHaveBeenCalled()
  })

  it('só considera cancelada a loja SEM nenhuma assinatura vigente', async () => {
    // Arrange
    const { prisma, store, deps } = createFakes()

    // Act
    await processarLojasInativas(prisma, deps)

    // Assert — o filtro de inatividade exige "some CANCELLED antiga" e
    // "none ACTIVE/PENDING/PAUSED": loja que reassinou nunca entra no ciclo
    const filtroExcluir = store.findMany.mock.calls[0][0].where.AND[0]
    const caminhoCancelada = filtroExcluir.OR[1]
    expect(caminhoCancelada.subscriptions.none).toEqual({
      status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] },
    })
    expect(caminhoCancelada.subscriptions.some.status).toBe('CANCELLED')
  })
})
