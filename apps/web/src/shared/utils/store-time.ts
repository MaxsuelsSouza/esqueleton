// Data e hora atuais no fuso horário de referência da plataforma.
//
// Por que isso existe: o servidor pode rodar em UTC (ex: Vercel) e o navegador
// roda no fuso do cliente. Se cada lado calcular "hoje" e "agora" do seu jeito,
// promoções, cupons e destaques mudam de comportamento dependendo de onde o
// código roda (ex: uma promoção que "termina hoje" pararia às 21h no Brasil).
// Todas as janelas de data (AAAA-MM-DD) e horário (HH:mm) cadastradas no painel
// são interpretadas SEMPRE neste fuso, tanto na API quanto no site.
// Este arquivo é um espelho de apps/api/src/shared/datetime/store-time.ts.
export const STORE_TIMEZONE = 'America/Sao_Paulo'

export type StoreDateTime = {
  // Data atual no fuso da loja, formato AAAA-MM-DD
  date: string
  // Horário atual no fuso da loja, formato HH:mm
  time: string
}

// Retorna a data e o horário atuais no fuso da loja
export function getStoreDateTime(now: Date = new Date()): StoreDateTime {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: STORE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}
