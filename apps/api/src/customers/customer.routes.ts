// Rotas de clientes — divididas em dois grupos:
//   - customerPublicRoutes: cadastro feito na sacola antes do envio pelo WhatsApp, a loja vem do slug
//   - customerAdminRoutes: listagem pelo painel, a loja vem do token JWT
import type { FastifyInstance } from 'fastify'
import { upsertCustomerSchema } from './customer.schema'

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

// ── Rota do admin — a loja vem do token JWT ────────────────────────
export async function customerAdminRoutes(app: FastifyInstance) {
  // GET /api/customers — protegido, lista os clientes da loja
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const customers = await app.prisma.customer.findMany({
      where: { storeId: request.user.storeId },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(customers)
  })
}
