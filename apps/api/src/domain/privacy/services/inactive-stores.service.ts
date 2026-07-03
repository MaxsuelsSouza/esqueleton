// Lojas inativas (LGPD, Fase 3.5) — quando a finalidade do tratamento acaba,
// os dados devem ser eliminados (arts. 15-16). Uma loja suspensa ou cancelada
// há mais de 6 meses recebe um aviso por e-mail; sem reativação em 30 dias,
// é excluída definitivamente (o cascade do banco apaga todos os dados dela).
//
// Varre TODAS as lojas (job de plataforma) — recebe o cliente Prisma SEM o
// tenant guard (prismaRaw), como as rotas super-admin. NUNCA usar em rota de loja.
import type { PrismaClient } from '@prisma/client'
import { excluirLoja } from './store-data.service'

// Prazos da Fase 3.5 do plano LGPD
export const LOJA_INATIVA = {
  // Meses de inatividade (suspensa/cancelada) até o aviso de exclusão
  MESES_ATE_AVISO: 6,
  // Dias entre o aviso e a exclusão definitiva
  DIAS_DO_AVISO_ATE_EXCLUSAO: 30,
} as const

// O serviço não conhece Fastify — as integrações chegam como funções simples
type Dependencias = {
  // Envia o aviso de exclusão ao dono da loja
  enviarAvisoDeExclusao: (emailDoDono: string, nomeDaLoja: string) => Promise<void>
  // Cancela uma assinatura recorrente no MercadoPago (evita cobrar loja excluída)
  cancelarAssinatura: (preapprovalId: string) => Promise<boolean>
  // Apaga as imagens da loja no R2 (fire-and-forget — falha não impede a exclusão)
  apagarImagensDaLoja: (storeId: string) => void
}

function mesesAtras(meses: number): Date {
  const data = new Date()
  data.setMonth(data.getMonth() - meses)
  return data
}

function diasAtras(dias: number): Date {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000)
}

// Filtro de "loja inativa". Dois caminhos:
// 1. Suspensa pela plataforma — vale o tempo parada (updatedAt) OU um aviso já
//    enviado (o carimbo do aviso atualiza o updatedAt, então sem essa segunda
//    condição a loja avisada "sairia" da inatividade no dia seguinte).
// 2. Assinatura cancelada há mais de 6 meses e nenhuma assinatura vigente.
//    Lojas que nunca assinaram (só trial expirado) NÃO entram — podem ser
//    donos avaliando a plataforma; excluí-las seria agressivo demais.
function filtroDeLojaInativa(corteInatividade: Date) {
  return {
    OR: [
      {
        status: 'SUSPENDED',
        OR: [{ updatedAt: { lt: corteInatividade } }, { deletionWarnedAt: { not: null } }],
      },
      {
        status: 'ACTIVE',
        subscriptions: {
          some: { status: 'CANCELLED', updatedAt: { lt: corteInatividade } },
          none: { status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] } },
        },
      },
    ],
  }
}

// Executa o ciclo completo: exclui as avisadas há 30+ dias, limpa o aviso das
// que reativaram e avisa as recém-inativas. Retorna contagens para o log do job.
export async function processarLojasInativas(prisma: PrismaClient, deps: Dependencias) {
  const corteInatividade = mesesAtras(LOJA_INATIVA.MESES_ATE_AVISO)
  const corteAviso = diasAtras(LOJA_INATIVA.DIAS_DO_AVISO_ATE_EXCLUSAO)
  const filtroInativa = filtroDeLojaInativa(corteInatividade)

  // 1. Exclui lojas avisadas há mais de 30 dias que continuam inativas
  const lojasParaExcluir = await prisma.store.findMany({
    where: { AND: [filtroInativa, { deletionWarnedAt: { lt: corteAviso } }] },
    include: {
      // Assinaturas ainda cobrando precisam ser canceladas no MercadoPago antes
      subscriptions: {
        where: {
          status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] },
          mercadoPagoPreapprovalId: { not: null },
        },
        select: { mercadoPagoPreapprovalId: true },
      },
    },
  })
  for (const loja of lojasParaExcluir) {
    for (const assinatura of loja.subscriptions) {
      await deps.cancelarAssinatura(assinatura.mercadoPagoPreapprovalId!)
    }
    await excluirLoja(prisma, loja.id)
    deps.apagarImagensDaLoja(loja.id)
  }

  // 2. Limpa o aviso de lojas que voltaram à atividade (reativadas ou reassinadas)
  const { count: avisosCancelados } = await prisma.store.updateMany({
    where: { deletionWarnedAt: { not: null }, NOT: filtroInativa },
    data: { deletionWarnedAt: null },
  })

  // 3. Avisa os donos das lojas recém-inativas e carimba a data do aviso
  const lojasParaAvisar = await prisma.store.findMany({
    where: { AND: [filtroInativa, { deletionWarnedAt: null }] },
    include: {
      users: { where: { role: 'OWNER' }, select: { email: true } },
    },
  })
  for (const loja of lojasParaAvisar) {
    for (const dono of loja.users) {
      await deps.enviarAvisoDeExclusao(dono.email, loja.name)
    }
    await prisma.store.updateMany({
      where: { id: loja.id },
      data: { deletionWarnedAt: new Date() },
    })
  }

  return {
    lojasExcluidas: lojasParaExcluir.length,
    lojasAvisadas: lojasParaAvisar.length,
    avisosCancelados,
  }
}
