// Ferramentas para o lojista atender os direitos dos clientes dele (art. 18 da LGPD):
// corrigir, exportar e excluir cadastros, com anonimização dos pedidos correspondentes.
// Recebe PrismaClient e dados já validados; não conhece HTTP nem Fastify.
import type { PrismaClient } from '@prisma/client'

// Anonimiza os pedidos de um telefone: nome e telefone viram null, mas os
// valores permanecem para a estatística da loja — dado anonimizado deixa de
// ser dado pessoal (art. 12 da LGPD). Também limpa as notificações de pedido
// que duplicam nome/telefone no campo metadata.
export async function anonimizarPedidosDoCliente(
  prisma: PrismaClient,
  storeId: string,
  phone: string,
): Promise<number> {
  const [pedidos] = await Promise.all([
    prisma.order.updateMany({
      where: { storeId, customerPhone: phone },
      data: { customerName: null, customerPhone: null },
    }),
    prisma.notification.updateMany({
      where: { storeId, type: 'NEW_ORDER', metadata: { contains: phone } },
      data: { metadata: null },
    }),
  ])
  return pedidos.count
}

// Monta o pacote de portabilidade de um cliente (art. 18, V): cadastro +
// todos os pedidos feitos com o telefone dele nesta loja.
// Retorna null quando o cliente não existe (ou pertence a outra loja).
export async function exportarDadosDoCliente(
  prisma: PrismaClient,
  storeId: string,
  customerId: string,
) {
  const cliente = await prisma.customer.findFirst({
    where: { id: customerId, storeId },
  })
  if (!cliente) return null

  const pedidos = await prisma.order.findMany({
    where: { storeId, customerPhone: cliente.phone },
    orderBy: { createdAt: 'desc' },
  })

  return {
    exportadoEm: new Date().toISOString(),
    cliente: {
      id: cliente.id,
      nome: cliente.name,
      telefone: cliente.phone,
      cadastradoEm: cliente.createdAt,
      atualizadoEm: cliente.updatedAt,
    },
    pedidos: pedidos.map((pedido) => ({
      numero: pedido.orderNumber,
      itens: pedido.items,
      subtotal: pedido.subtotal,
      desconto: pedido.discount,
      total: pedido.total,
      cupom: pedido.couponCode,
      status: pedido.status,
      criadoEm: pedido.createdAt,
    })),
  }
}
