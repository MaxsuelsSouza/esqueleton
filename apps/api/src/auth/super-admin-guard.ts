import type { FastifyRequest, FastifyReply } from 'fastify'

// Verifica se o usuário é administrador da plataforma — usado nas rotas /api/super.
// A flag isSuperAdmin vem do token JWT (definida manualmente no banco, sem tela própria).
// Tokens antigos não carregam a flag — caem no 403, exigindo novo login.
export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user.isSuperAdmin) {
    return reply.status(403).send({
      message: 'Acesso restrito à administração da plataforma.',
    })
  }
}
