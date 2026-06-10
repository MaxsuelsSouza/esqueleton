import fp from 'fastify-plugin'
import jwtPlugin from '@fastify/jwt'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string }
    user: { sub: string; email: string }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  app.register(jwtPlugin, {
    secret: process.env.JWT_SECRET ?? 'troque-em-producao',
  })

  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify()
      } catch (err) {
        reply.send(err)
      }
    }
  )
}

export const jwtAuthPlugin = fp(plugin)
