// Ciclo de cobrança das assinaturas — a cobrança acontece SEMPRE no dia 10.
//
// Regra do primeiro débito: quem assina não paga o mês vigente. O cartão é
// coletado no checkout, mas o primeiro débito só acontece no dia 10 do mês
// seguinte ao cadastro. A partir daí a recorrência é mensal, sempre no dia 10.

// Dia do mês em que a cobrança acontece
export const DIA_DA_COBRANCA = 10

// Dias de carência do primeiro débito na venda presencial (super-admin)
export const CARENCIA_VENDA_PRESENCIAL_DIAS = 30

// Timestamp (segundos) do dia 10, ao meio-dia UTC, em ou após a data informada.
// Meio-dia evita que fuso horário empurre a data para o dia 9 ou 11.
function diaDezEmOuApos(data: Date): number {
  const ano = data.getUTCFullYear()
  const mes = data.getUTCMonth()
  // Se ainda não passou do dia 10 no mês da data, cobra neste mês; senão, no seguinte.
  const mesDoDebito = data.getUTCDate() <= DIA_DA_COBRANCA ? mes : mes + 1
  const debito = new Date(Date.UTC(ano, mesDoDebito, DIA_DA_COBRANCA, 12, 0, 0))
  return Math.floor(debito.getTime() / 1000)
}

// Retorna o timestamp (em SEGUNDOS, como o Stripe espera em trial_end) do
// primeiro débito: dia 10 do mês seguinte ao da data informada, ao meio-dia UTC.
// Usado no autocadastro público — não cobra o mês vigente.
export function proximoDiaDezUnix(from: Date): number {
  // Mês seguinte ao da assinatura (o construtor do Date normaliza dezembro → janeiro)
  const ano = from.getUTCFullYear()
  const mes = from.getUTCMonth()
  const primeiroDebito = new Date(Date.UTC(ano, mes + 1, DIA_DA_COBRANCA, 12, 0, 0))
  return Math.floor(primeiroDebito.getTime() / 1000)
}

// Primeiro débito da VENDA PRESENCIAL (super-admin): 30 dias de carência a partir
// da compra e, então, o próximo dia 10. Ex.: compra em 20/jul → +30 dias ≈ 19/ago
// → como já passou do dia 10 de agosto, o débito fica ancorado em 10/set.
export function primeiroDebitoVendaPresencial(from: Date): number {
  const comCarencia = new Date(from.getTime())
  comCarencia.setUTCDate(comCarencia.getUTCDate() + CARENCIA_VENDA_PRESENCIAL_DIAS)
  return diaDezEmOuApos(comCarencia)
}
