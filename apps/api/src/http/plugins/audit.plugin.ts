// Log de auditoria (LGPD, Fase 4.1) — app.audit() grava quem fez o quê,
// quando e de qual IP, para ações sensíveis (login, troca de senha,
// exclusões, exportações, ações de super-admin).
//
// Fire-and-forget de propósito: uma falha ao gravar auditoria NUNCA pode
// quebrar a ação do usuário — o erro vai para o log do servidor e a
// requisição segue normalmente.
import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'

// Ações registradas — lista fechada para manter os relatórios consistentes
export type AuditAction =
  | 'LOGIN'
  | 'LOGIN_FALHOU'
  | 'TROCA_DE_SENHA'
  | 'SENHA_REDEFINIDA'
  | 'MEMBRO_CONVIDADO'
  | 'MEMBRO_REMOVIDO'
  | 'CLIENTE_EXCLUIDO'
  | 'CLIENTE_EXPORTADO'
  | 'LOJA_EXPORTADA'
  | 'LOJA_EXCLUIDA'
  | 'PLATAFORMA_LOJA_ALTERADA'

export type AuditEntry = {
  action: AuditAction
  // null em ações de plataforma (ex: super-admin) ou quando o usuário não é conhecido
  storeId?: string | null
  userId?: string | null
  // Contexto adicional legível (ex: e-mail do membro removido) — nunca gravar senhas
  detail?: string
  ip?: string
}

declare module 'fastify' {
  interface FastifyInstance {
    audit: (entrada: AuditEntry) => void
  }
}

export const auditPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('audit', (entrada: AuditEntry) => {
    // Promise.resolve().then(...) captura também erros síncronos (ex: banco
    // falso dos testes sem a tabela auditLog) — nada disso afeta a requisição
    Promise.resolve()
      .then(() =>
        app.prisma.auditLog.create({
          data: {
            action: entrada.action,
            storeId: entrada.storeId ?? null,
            userId: entrada.userId ?? null,
            detail: entrada.detail ?? null,
            ip: entrada.ip ?? null,
          },
        }),
      )
      .catch((error) => {
        app.log.error({ error, action: entrada.action }, 'Falha ao gravar log de auditoria')
      })
  })
})
