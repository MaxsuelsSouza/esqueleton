// Regra de disponibilidade da loja — verifica se está dentro do trial ou tem assinatura ativa
import type { PrismaClient } from '@prisma/client'
import { TRIAL_MS } from '../../billing/trial'

// Uma loja está disponível para o público quando:
//   1. Está dentro dos 7 dias de teste após o cadastro, OU
//   2. Tem uma assinatura ativa
export async function isStoreAvailable(
  prisma: PrismaClient,
  store: { id: string; createdAt: Date },
): Promise<boolean> {
  const dentroDoTeste = Date.now() - store.createdAt.getTime() < TRIAL_MS
  if (dentroDoTeste) {
    return true
  }

  const assinaturaAtiva = await prisma.subscription.findFirst({
    where: { storeId: store.id, status: 'ACTIVE' },
    select: { id: true },
  })
  return Boolean(assinaturaAtiva)
}
