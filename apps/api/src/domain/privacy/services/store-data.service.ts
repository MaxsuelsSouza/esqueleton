// Direitos do lojista sobre a própria conta (art. 18 da LGPD):
// exportação de todos os dados da loja (portabilidade) e exclusão definitiva.
// Recebe PrismaClient e dados já validados; não conhece HTTP nem Fastify.
import type { PrismaClient } from '@prisma/client'

// Monta o pacote de portabilidade da loja: perfil, equipe (sem senhas),
// catálogo, promoções, cupons, pedidos, clientes e assinaturas.
export async function exportarDadosDaLoja(prisma: PrismaClient, storeId: string) {
  const [loja, perfil, equipe, produtos, categorias, promocoes, cupons, destaques, pedidos, clientes, assinaturas] =
    await Promise.all([
      prisma.store.findUnique({ where: { id: storeId } }),
      prisma.storeProfile.findFirst({ where: { storeId } }),
      prisma.user.findMany({
        where: { storeId },
        // Nunca exportar o hash da senha
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          acceptedTermsAt: true,
          acceptedTermsVersion: true,
          createdAt: true,
        },
      }),
      prisma.product.findMany({
        where: { storeId },
        include: { categories: true, variants: true },
      }),
      prisma.category.findMany({ where: { storeId } }),
      prisma.promotion.findMany({ where: { storeId } }),
      prisma.coupon.findMany({ where: { storeId } }),
      prisma.featured.findMany({ where: { storeId } }),
      prisma.order.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } }),
      prisma.customer.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } }),
      prisma.subscription.findMany({ where: { storeId } }),
    ])

  return {
    exportadoEm: new Date().toISOString(),
    loja,
    perfil,
    equipe,
    produtos,
    categorias,
    promocoes,
    cupons,
    destaques,
    pedidos,
    clientes,
    assinaturas,
  }
}

// Exclui a loja definitivamente. O onDelete: Cascade do schema apaga todos os
// dados relacionados (usuários, produtos, pedidos, clientes, notificações...).
// Imagens no R2 e cancelamento no MercadoPago são tratados pela rota, que tem
// acesso aos serviços de infraestrutura.
export async function excluirLoja(prisma: PrismaClient, storeId: string): Promise<void> {
  await prisma.store.delete({ where: { id: storeId } })
}
