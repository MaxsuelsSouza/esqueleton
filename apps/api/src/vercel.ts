// Entrada para deploy na Vercel (serverless)
//
// Em serverless cada invocação pode cair numa instância diferente.
// O app Fastify é criado uma vez e reutilizado entre invocações da mesma
// instância (warm start). O `await app.ready()` é idempotente — na segunda
// chamada retorna imediatamente.
import { buildApp } from './app'

const app = buildApp()

export default async (req: any, res: any) => {
  await app.ready()
  app.server.emit('request', req, res)
}
