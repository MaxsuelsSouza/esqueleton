// Período de teste do SaaS ("pagou, usou"): toda loja nova funciona por 7 dias
// a partir do cadastro. Depois disso, o catálogo público só fica no ar com uma
// assinatura ativa. O painel admin continua acessível para o lojista assinar.

export const TRIAL_DIAS = 7
export const TRIAL_MS = TRIAL_DIAS * 24 * 60 * 60 * 1000

// Calcula a situação do período de teste de uma loja
export function trialStatus(storeCreatedAt: Date) {
  const endsAt = new Date(storeCreatedAt.getTime() + TRIAL_MS)
  const msRestantes = endsAt.getTime() - Date.now()
  return {
    endsAt,
    active: msRestantes > 0,
    // Dias restantes arredondados para cima — "faltam 3 dias" até o último instante do 3º dia
    daysLeft: Math.max(0, Math.ceil(msRestantes / (24 * 60 * 60 * 1000))),
  }
}
