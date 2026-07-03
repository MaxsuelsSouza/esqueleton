// Retenção e eliminação de dados (arts. 15-16 da LGPD) — limpeza periódica:
// dados pessoais são eliminados ou anonimizados quando a finalidade acaba.
// Todas as funções varrem TODAS as lojas de uma vez (job de plataforma), por
// isso recebem o cliente Prisma SEM o tenant guard (prismaRaw) — a mesma
// exceção documentada das rotas super-admin. NUNCA use estas funções em
// rotas de loja.
import type { PrismaClient } from '@prisma/client'

// Prazos de retenção — vêm do plano de implementação da LGPD (§5, Fase 3)
export const RETENCAO = {
  // Tokens usados ou expirados são lixo de segurança: eliminar após 24h
  TOKENS_HORAS_APOS_EXPIRAR: 24,
  // Notificações são efêmeras — o metadata duplica nome/telefone do cliente
  NOTIFICACOES_DIAS: 90,
  // Pedidos antigos: mantêm valores para estatística, mas nome/telefone são anonimizados
  PEDIDOS_MESES: 24,
  // Clientes sem pedido novo no mesmo período são eliminados
  CLIENTES_MESES: 24,
  // Eventos de analytics não têm dado pessoal, mas a tabela cresce sem limite
  EVENTOS_MESES: 12,
} as const

// Data de "N horas atrás" — tudo anterior a ela está fora do prazo de retenção
function horasAtras(horas: number): Date {
  return new Date(Date.now() - horas * 60 * 60 * 1000)
}

// Data de "N dias atrás"
function diasAtras(dias: number): Date {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000)
}

// Data de "N meses atrás" (meses de calendário)
function mesesAtras(meses: number): Date {
  const data = new Date()
  data.setMonth(data.getMonth() - meses)
  return data
}

// Fase 3.1 — Apaga tokens de reset de senha e de verificação de e-mail que já
// foram usados ou que expiraram há mais de 24h. Hoje eles ficariam para sempre.
export async function limparTokensExpirados(prisma: PrismaClient) {
  const limite = horasAtras(RETENCAO.TOKENS_HORAS_APOS_EXPIRAR)
  const filtro = {
    OR: [{ usedAt: { not: null } }, { expiresAt: { lt: limite } }],
  }
  const [reset, verificacao] = await Promise.all([
    prisma.passwordResetToken.deleteMany({ where: filtro }),
    prisma.emailVerificationToken.deleteMany({ where: filtro }),
  ])
  return { tokensReset: reset.count, tokensVerificacao: verificacao.count }
}

// Fase 3.2 — Apaga notificações com mais de 90 dias. As de pedido (NEW_ORDER)
// duplicam nome e telefone do cliente no campo metadata — eliminá-las remove
// essa cópia de dado pessoal.
export async function limparNotificacoesAntigas(prisma: PrismaClient) {
  const { count } = await prisma.notification.deleteMany({
    where: { createdAt: { lt: diasAtras(RETENCAO.NOTIFICACOES_DIAS) } },
  })
  return { notificacoes: count }
}

// Fase 3.3 — Anonimiza pedidos antigos (nome/telefone viram null; valores
// permanecem para a estatística da loja — dado anonimizado deixa de ser dado
// pessoal, art. 12) e apaga clientes sem pedido novo no mesmo período
// (updatedAt é atualizado a cada novo pedido pelo upsert de identificação).
export async function anonimizarPedidosEClientesAntigos(prisma: PrismaClient) {
  const limitePedidos = mesesAtras(RETENCAO.PEDIDOS_MESES)
  const limiteClientes = mesesAtras(RETENCAO.CLIENTES_MESES)

  const [pedidos, clientes] = await Promise.all([
    prisma.order.updateMany({
      where: {
        createdAt: { lt: limitePedidos },
        // Só toca em pedidos que ainda têm dado pessoal
        OR: [{ customerName: { not: null } }, { customerPhone: { not: null } }],
      },
      data: { customerName: null, customerPhone: null },
    }),
    prisma.customer.deleteMany({
      where: { updatedAt: { lt: limiteClientes } },
    }),
  ])
  return { pedidosAnonimizados: pedidos.count, clientesEliminados: clientes.count }
}

// Fase 3.4 — Expurga eventos de analytics com mais de 12 meses. Eles não têm
// identificador de pessoa (são anônimos), mas a tabela cresce sem limite.
export async function expurgarEventosAntigos(prisma: PrismaClient) {
  const { count } = await prisma.productEvent.deleteMany({
    where: { createdAt: { lt: mesesAtras(RETENCAO.EVENTOS_MESES) } },
  })
  return { eventos: count }
}

// Executa toda a limpeza de uma vez — chamado pelo job agendado (cron).
// Retorna a contagem de cada etapa para registro em log.
export async function executarLimpezaDeRetencao(prisma: PrismaClient) {
  const [tokens, notificacoes, pedidosEClientes, eventos] = await Promise.all([
    limparTokensExpirados(prisma),
    limparNotificacoesAntigas(prisma),
    anonimizarPedidosEClientesAntigos(prisma),
    expurgarEventosAntigos(prisma),
  ])
  return { ...tokens, ...notificacoes, ...pedidosEClientes, ...eventos }
}
