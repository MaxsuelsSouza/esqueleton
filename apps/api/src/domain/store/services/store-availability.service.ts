// Regra de disponibilidade da loja — verifica se está dentro do trial ou tem assinatura ativa
import type { PrismaClient } from '@prisma/client'
import { TRIAL_MS } from '../../billing/trial'

// Uma loja está disponível para o público quando:
//   1. Tem uma assinatura ativa, OU
//   2. Está dentro dos 7 dias de teste após o cadastro —
//      EXCETO se houver uma assinatura PENDING_SETUP (venda presencial aguardando
//      a confirmação manual da taxa de implantação): nesse caso o trial não vale,
//      a loja só entra no ar depois que a implantação é confirmada
export async function isStoreAvailable(
  prisma: PrismaClient,
  store: { id: string; createdAt: Date },
): Promise<boolean> {
  const assinaturaAtiva = await prisma.subscription.findFirst({
    where: { storeId: store.id, status: 'ACTIVE' },
    select: { id: true },
  })
  if (assinaturaAtiva) {
    return true
  }

  const aguardandoImplantacao = await prisma.subscription.findFirst({
    where: { storeId: store.id, status: 'PENDING_SETUP' },
    select: { id: true },
  })
  if (aguardandoImplantacao) {
    return false
  }

  return Date.now() - store.createdAt.getTime() < TRIAL_MS
}
