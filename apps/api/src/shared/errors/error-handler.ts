// Handler global de erros — trata validações Zod e esconde detalhes de erros internos
import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ message: 'Dados inválidos', errors: error.errors })
    }
    app.log.error({ err: error, msg: error.message, stack: error.stack }, 'Erro não tratado')

    // Erros internos (500+) não devem expor detalhes do servidor ou do banco de dados
    const statusCode = error.statusCode ?? 500
    const message = statusCode >= 500 ? 'Erro interno do servidor' : error.message
    reply.status(statusCode).send({ message })
  })
}
