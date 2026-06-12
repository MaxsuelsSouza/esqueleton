import type { FastifyRequest, FastifyReply } from 'fastify'

// Verifica se o usuário é OWNER da loja — usado nas rotas que exigem
// controle total (editar perfil, convidar/remover equipe, gerenciar plano).
export async function requireOwner(request: FastifyRequest, reply: FastifyReply) {
  if (request.user.role !== 'OWNER') {
    return reply.status(403).send({
      message: 'Apenas o proprietário da loja pode realizar esta ação.',
    })
  }
}

// Bloqueia acesso quando o e-mail não foi verificado e já passou o período
// de tolerância (7 dias após o cadastro). Consulta a data de criação no banco
// porque o JWT não carrega essa informação.
export async function requireVerifiedEmail(request: FastifyRequest, reply: FastifyReply) {
  // E-mail já verificado — libera
  if (request.user.emailVerified) return

  // Busca a data de criação do usuário para calcular os dias sem verificação
  const app = request.server
  const user = await app.prisma.user.findUnique({
    where: { id: request.user.sub },
    select: { createdAt: true },
  })

  if (!user) {
    return reply.status(401).send({ message: 'Não autorizado. Faça login novamente.' })
  }

  const daysSinceCreation = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)

  // 7 dias de tolerância — depois disso, o e-mail precisa ser verificado
  if (daysSinceCreation > 7) {
    return reply.status(403).send({
      message: 'Verifique seu e-mail para continuar usando o painel. Acesse o menu para reenviar o link de verificação.',
    })
  }
}
