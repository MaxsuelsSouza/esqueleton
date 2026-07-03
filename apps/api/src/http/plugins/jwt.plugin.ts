import fp from 'fastify-plugin'
import jwtPlugin from '@fastify/jwt'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { requireVerifiedEmail } from '../../domain/identity/guards/role.guard'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    // storeId identifica a loja do usuário — toda consulta do admin filtra por ele
    // role: OWNER (dono, controle total) ou STAFF (equipe, acesso limitado)
    // isSuperAdmin: administrador da plataforma — opcional porque tokens antigos não carregam
    payload: { sub: string; email: string; storeId: string; role: string; emailVerified: boolean; isSuperAdmin?: boolean }
    user: { sub: string; email: string; storeId: string; role: string; emailVerified: boolean; isSuperAdmin?: boolean }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyContextConfig {
    // Rotas com esta marca não exigem e-mail verificado mesmo após os 7 dias
    // de tolerância — usada no reenvio do link de verificação
    skipEmailVerification?: boolean
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  const secret = process.env.JWT_SECRET

  // Em produção o segredo é obrigatório — sem ele qualquer pessoa conseguiria
  // forjar um token de administrador, já que o valor padrão seria conhecido
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET é obrigatório em produção. Defina a variável de ambiente antes de iniciar a API.')
  }

  app.register(jwtPlugin, {
    secret: secret ?? 'segredo-apenas-para-desenvolvimento-local',
    // Token expira em 1 dia — limita o estrago caso um token vaze
    sign: { expiresIn: '1d' },
  })

  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify()
        // Tokens antigos não carregam storeId ou role — sem eles nenhuma
        // consulta pode ser feita, então o login precisa ser refeito
        if (!request.user.storeId || !request.user.role) {
          return reply.status(401).send({ message: 'Não autorizado. Faça login novamente.' })
        }
      } catch {
        // Token ausente, inválido ou expirado — nega o acesso sem expor detalhes
        return reply.status(401).send({ message: 'Não autorizado. Faça login novamente.' })
      }

      // Após 7 dias sem verificar o e-mail, o painel é bloqueado (403) —
      // exceto nas rotas marcadas com skipEmailVerification (reenvio do link).
      // Em desenvolvimento local a verificação é ignorada para não travar o painel;
      // nos testes (NODE_ENV=test) ela vale como em produção, para a regra ser testável.
      const isDev = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'
      if (!isDev && !request.routeOptions.config.skipEmailVerification) {
        await requireVerifiedEmail(request, reply)
      }
    }
  )
}

export const jwtAuthPlugin = fp(plugin)
