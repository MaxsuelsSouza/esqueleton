// Lista de todos os usuários da plataforma — exclusivo do super-admin.
import type { FastifyPluginAsync } from 'fastify'
import { requireSuperAdmin } from '../../../domain/identity/guards/super-admin.guard'
import { listUsersQuerySchema } from '../../schemas/super.schema'

const USUARIOS_POR_PAGINA = 20

export const superUsersRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', requireSuperAdmin)

  // GET /api/super/users — todos os usuários, com busca por e-mail e paginação
  app.get('/', async (request) => {
    const { page, search } = listUsersQuerySchema.parse(request.query)

    const where = search
      ? { email: { contains: search, mode: 'insensitive' as const } }
      : {}

    const [users, total] = await Promise.all([
      app.prismaRaw.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * USUARIOS_POR_PAGINA,
        take: USUARIOS_POR_PAGINA,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          isSuperAdmin: true,
          createdAt: true,
          store: { select: { slug: true, name: true } },
        },
      }),
      app.prismaRaw.user.count({ where }),
    ])

    return { data: users, total, page, perPage: USUARIOS_POR_PAGINA }
  })
}
