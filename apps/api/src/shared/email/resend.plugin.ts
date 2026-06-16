import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { Resend } from 'resend'

// Serviço de envio de e-mail usado para reset de senha e verificação de conta.
// Se a chave RESEND_API_KEY não estiver definida, os envios são ignorados (apenas logados)
// — assim o dev pode rodar sem configurar o Resend.

type EmailService = {
  send: (to: string, subject: string, html: string) => Promise<void>
}

declare module 'fastify' {
  interface FastifyInstance {
    email: EmailService
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.FROM_EMAIL ?? 'noreply@esqueleton.com'

  if (!apiKey) {
    app.log.warn('RESEND_API_KEY não definida — e-mails não serão enviados (apenas logados)')

    // No-op: loga o envio sem mandar de verdade
    app.decorate('email', {
      send: async (to: string, subject: string, _html: string) => {
        app.log.info(`[email no-op] Para: ${to} | Assunto: ${subject}`)
      },
    } satisfies EmailService)
    return
  }

  const resend = new Resend(apiKey)

  app.decorate('email', {
    send: async (to: string, subject: string, html: string) => {
      const { error } = await resend.emails.send({
        from: fromEmail,
        to,
        subject,
        html,
      })

      if (error) {
        app.log.error({ error, to, subject }, 'Falha ao enviar e-mail')
        throw new Error('Falha ao enviar e-mail')
      }
    },
  } satisfies EmailService)
}

export const resendPlugin = fp(plugin)
