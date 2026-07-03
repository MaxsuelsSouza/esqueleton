import type { FastifyPluginAsync } from 'fastify'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { requireOwner } from '../../../domain/identity/guards/role.guard'
import { idParamSchema } from '../../../shared/validation/schemas'

// Gestão de usuários da loja — apenas o OWNER pode listar e remover membros da equipe.
// Criar novos usuários continua sendo feito pelo POST /api/auth/register (modo 2).

export const userAdminRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas exigem autenticação + ser OWNER
  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', requireOwner)

  // Lista todos os usuários da loja
  app.get('/', async (request) => {
    const users = await app.prisma.user.findMany({
      where: { storeId: request.user.storeId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        mustChangePassword: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return users
  })

  // Remove um membro da equipe — o OWNER não pode remover a si mesmo
  app.delete('/:id', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)

    // Não permite que o OWNER se remova
    if (id === request.user.sub) {
      return reply.status(400).send({
        message: 'Você não pode remover a si mesmo.',
      })
    }

    // Busca o e-mail antes de remover — fica registrado na auditoria
    const membro = await app.prisma.user.findFirst({
      where: { id, storeId: request.user.storeId },
      select: { email: true },
    })

    // Remove apenas se o usuário pertence à mesma loja
    const { count } = await app.prisma.user.deleteMany({
      where: { id, storeId: request.user.storeId },
    })

    if (count === 0) {
      return reply.status(404).send({ message: 'Usuário não encontrado' })
    }

    // Revogação de sessão (LGPD, Fase 4.4): o token do membro removido deixa
    // de valer imediatamente — sem isso ele continuaria acessando o painel
    // até o token expirar (1 dia)
    try {
      await app.sessionStore.setRevogacao(id, Math.floor(Date.now() / 1000))
    } catch (error) {
      app.log.error({ error, userId: id }, 'Falha ao revogar a sessão do membro removido')
    }

    // Auditoria (LGPD): remoção de membro da equipe
    app.audit({
      action: 'MEMBRO_REMOVIDO',
      storeId: request.user.storeId,
      userId: request.user.sub,
      detail: `Removeu ${membro?.email ?? id}`,
      ip: request.ip,
    })

    return reply.status(204).send()
  })

  // Reseta a senha de um membro da equipe — gera uma senha temporária aleatória
  // que o OWNER deve repassar ao membro. No próximo login, o membro será
  // obrigado a trocar a senha (mustChangePassword = true).
  app.post('/:id/reset-password', async (request, reply) => {
    const { id } = idParamSchema.parse(request.params)

    // Não permite resetar a própria senha por essa rota
    if (id === request.user.sub) {
      return reply.status(400).send({
        message: 'Use a opção "Alterar senha" para trocar a sua própria senha.',
      })
    }

    // Gera uma senha aleatória de 10 caracteres (letras e números)
    const temporaryPassword = crypto.randomBytes(5).toString('hex')
    const hashed = await bcrypt.hash(temporaryPassword, 10)

    const { count } = await app.prisma.user.updateMany({
      where: { id, storeId: request.user.storeId },
      data: { password: hashed, mustChangePassword: true },
    })

    if (count === 0) {
      return reply.status(404).send({ message: 'Usuário não encontrado' })
    }

    // Revogação de sessão (LGPD, Fase 4.4): as sessões abertas do membro caem
    // junto com a senha antiga — ele volta apenas com a senha temporária
    try {
      await app.sessionStore.setRevogacao(id, Math.floor(Date.now() / 1000))
    } catch (error) {
      app.log.error({ error, userId: id }, 'Falha ao revogar sessões no reset de senha do membro')
    }

    // Retorna a senha em texto para o OWNER repassar ao membro
    return { temporaryPassword }
  })
}
