// Rota de clientes — salva nome e telefone coletados na sacola antes do envio pelo WhatsApp
import type { FastifyInstance } from 'fastify'
import { upsertCustomerSchema } from './customer.schema'

export async function customerRoutes(app: FastifyInstance) {

  // POST /api/customers — público, sem autenticação
  // Se o telefone já existir, atualiza o nome; caso contrário, cria um novo registro
  // Limite por IP — impede cadastro de clientes falsos em massa
  app.post('/', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { name, phone } = upsertCustomerSchema.parse(request.body)

    const customer = await app.prisma.customer.upsert({
      where: { phone },
      update: { name },
      create: { name, phone },
    })

    // Responde apenas a confirmação — os dados do cliente ficam visíveis só no painel admin
    return reply.status(201).send({ id: customer.id, message: 'Cliente registrado.' })
  })

  // GET /api/customers — protegido, lista todos os clientes para o admin
  app.get('/', { preHandler: [app.authenticate] }, async (_request, reply) => {
    const customers = await app.prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(customers)
  })
}
