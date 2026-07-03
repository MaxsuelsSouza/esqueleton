// Rotas de clientes — divididas em dois grupos:
//   - customerPublicRoutes: cadastro feito na sacola antes do envio pelo WhatsApp, a loja vem do slug
//   - customerAdminRoutes: listagem pelo painel, a loja vem do token JWT
import type { FastifyInstance } from 'fastify'
import { upsertCustomerSchema, updateCustomerSchema, deleteCustomerQuerySchema } from '../../schemas/customer.schema'
import { idParamSchema } from '../../../shared/validation/schemas'
import {
  anonimizarPedidosDoCliente,
  exportarDadosDoCliente,
} from '../../../domain/privacy/services/customer-rights.service'

// ── Rota pública — a loja vem do slug na URL ───────────────────────
export async function customerPublicRoutes(app: FastifyInstance) {

  // POST /api/lojas/:slug/customers — público, sem autenticação
  // Se o telefone já existir NESTA loja, atualiza o nome; caso contrário, cria um novo registro.
  // A mesma pessoa pode ser cliente de várias lojas — cada loja tem o próprio cadastro.
  // Limite por IP — impede cadastro de clientes falsos em massa
  app.post('/', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const storeId = request.store!.id
    const { name, phone } = upsertCustomerSchema.parse(request.body)

    const customer = await app.prisma.customer.upsert({
      where: { storeId_phone: { storeId, phone } },
      update: { name },
      create: { name, phone, storeId },
    })

    // Responde apenas a confirmação — os dados do cliente ficam visíveis só no painel admin
    return reply.status(201).send({ id: customer.id, message: 'Cliente registrado.' })
  })
}

// ── Rotas do admin — a loja vem do token JWT ───────────────────────
// Além da listagem, oferece as ferramentas do art. 18 da LGPD para o lojista
// atender os clientes dele: corrigir, exportar e excluir cadastros.
export async function customerAdminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/customers — lista os clientes da loja
  app.get('/', async (request, reply) => {
    const customers = await app.prisma.customer.findMany({
      where: { storeId: request.user.storeId },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(customers)
  })

  // PUT /api/customers/:id — corrige nome e/ou telefone (art. 18, III)
  app.put('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const storeId = request.user.storeId
    const data = updateCustomerSchema.parse(request.body)

    try {
      const { count } = await app.prisma.customer.updateMany({
        where: { id, storeId },
        data,
      })
      if (count === 0) return reply.status(404).send({ message: 'Cliente não encontrado' })
    } catch (error) {
      // Violação do unique storeId+phone — o telefone novo já pertence a outro cadastro
      if ((error as { code?: string })?.code === 'P2002') {
        return reply.status(409).send({ message: 'Já existe um cliente com este telefone' })
      }
      throw error
    }

    const updated = await app.prisma.customer.findFirst({ where: { id, storeId } })
    return reply.send(updated)
  })

  // GET /api/customers/:id/export — portabilidade (art. 18, V):
  // JSON com o cadastro e todos os pedidos do telefone do cliente
  app.get('/:id/export', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const exportacao = await exportarDadosDoCliente(app.prisma, request.user.storeId, id)
    if (!exportacao) return reply.status(404).send({ message: 'Cliente não encontrado' })
    return reply.send(exportacao)
  })

  // DELETE /api/customers/:id — eliminação (art. 18, VI).
  // Com ?anonimizarPedidos=true, remove também nome/telefone dos pedidos do
  // cliente (os valores permanecem para estatística) e limpa as notificações.
  app.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)
    const { anonimizarPedidos } = deleteCustomerQuerySchema.parse(request.query)
    const storeId = request.user.storeId

    // Busca antes de excluir — o telefone é necessário para anonimizar os pedidos
    const customer = await app.prisma.customer.findFirst({ where: { id, storeId } })
    if (!customer) return reply.status(404).send({ message: 'Cliente não encontrado' })

    if (anonimizarPedidos === 'true') {
      await anonimizarPedidosDoCliente(app.prisma, storeId, customer.phone)
    }

    await app.prisma.customer.deleteMany({ where: { id, storeId } })
    return reply.status(204).send()
  })
}
