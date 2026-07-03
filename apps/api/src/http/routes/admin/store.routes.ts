// Rotas da conta/loja — direitos do lojista sobre os próprios dados (LGPD):
//   GET  /api/store/export — portabilidade: dump JSON de todos os dados da loja
//   DELETE /api/store      — exclusão definitiva da loja (cascade apaga tudo)
// Ambas exigem OWNER; a exclusão pede a senha de novo como confirmação.
import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { requireOwner } from '../../../domain/identity/guards/role.guard'
import { exportarDadosDaLoja, excluirLoja } from '../../../domain/privacy/services/store-data.service'
import { buildStorePrefix } from '../../../shared/storage/r2-key'

// Confirmação da exclusão — a senha atual evita que uma sessão aberta
// (token roubado ou computador emprestado) apague a loja inteira
const deleteStoreSchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória para confirmar a exclusão'),
})

export const storeAdminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate)

  // GET /api/store/export — exporta todos os dados da loja em JSON (OWNER)
  app.get('/export', { preHandler: [requireOwner] }, async (request) => {
    // Auditoria (LGPD): exportação completa dos dados da loja
    app.audit({
      action: 'LOJA_EXPORTADA',
      storeId: request.user.storeId,
      userId: request.user.sub,
      ip: request.ip,
    })
    return exportarDadosDaLoja(app.prisma, request.user.storeId)
  })

  // DELETE /api/store — exclui a loja definitivamente (OWNER + senha).
  // Limite apertado: não é uma rota de uso repetido
  app.delete(
    '/',
    {
      preHandler: [requireOwner],
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const { password } = deleteStoreSchema.parse(request.body)
      const storeId = request.user.storeId

      // Confere a senha de quem está pedindo a exclusão
      const user = await app.prisma.user.findUnique({
        where: { id: request.user.sub },
        select: { password: true },
      })
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return reply.status(403).send({ message: 'Senha incorreta' })
      }

      // Cancela assinaturas recorrentes no MercadoPago antes de apagar —
      // sem isso a cobrança continuaria mesmo com a loja excluída
      const assinaturasCobrando = await app.prisma.subscription.findMany({
        where: {
          storeId,
          status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] },
          mercadoPagoPreapprovalId: { not: null },
        },
        select: { mercadoPagoPreapprovalId: true },
      })
      for (const assinatura of assinaturasCobrando) {
        const cancelou = await app.mercadopago.cancelSubscription(assinatura.mercadoPagoPreapprovalId!)
        if (!cancelou) {
          app.log.error(
            { storeId, preapprovalId: assinatura.mercadoPagoPreapprovalId },
            'Falha ao cancelar assinatura no MercadoPago durante exclusão da loja',
          )
        }
      }

      // Apaga a loja — o onDelete: Cascade elimina usuários, produtos,
      // pedidos, clientes, notificações e todos os demais dados
      await excluirLoja(app.prisma, storeId)

      // Imagens no R2 — fire-and-forget: a exclusão da loja não pode falhar
      // por causa do storage (as keys são segregadas pelo prefixo do storeId)
      app.storage?.deleteByPrefix(buildStorePrefix(storeId)).catch((error) => {
        app.log.error({ error, storeId }, 'Falha ao limpar imagens do R2 na exclusão da loja')
      })

      // Sacolas e favoritos no Redis expiram sozinhos (TTL de 30 dias) e são
      // apenas IDs de produtos — sem dado pessoal identificado

      app.log.warn({ storeId, userId: request.user.sub }, 'Loja excluída a pedido do proprietário (LGPD)')
      // Auditoria (LGPD): a loja já não existe, mas o registro sobrevive
      // (AuditLog não tem chave estrangeira para Store de propósito)
      app.audit({
        action: 'LOJA_EXCLUIDA',
        storeId,
        userId: request.user.sub,
        detail: 'Exclusão a pedido do proprietário',
        ip: request.ip,
      })
      return reply.status(204).send()
    },
  )
}
