import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const credentialsSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', async (request, reply) => {
    const { email, password } = credentialsSchema.parse(request.body)

    const existing = await app.prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({ message: 'Email já cadastrado' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await app.prisma.user.create({
      data: { email, password: hashed },
      select: { id: true, email: true, createdAt: true },
    })

    return reply.status(201).send(user)
  })

  app.post('/login', async (request, reply) => {
    const { email, password } = credentialsSchema.parse(request.body)

    const user = await app.prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.status(401).send({ message: 'Credenciais inválidas' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return reply.status(401).send({ message: 'Credenciais inválidas' })
    }

    const token = app.jwt.sign({ sub: user.id, email: user.email })
    return { token }
  })
}
