// Testes da regra de ciclo de cobrança (primeiro débito no dia 10 do mês seguinte)
import { describe, it, expect } from 'vitest'
import { proximoDiaDezUnix, primeiroDebitoVendaPresencial, DIA_DA_COBRANCA } from './billing-cycle'

// Converte o unix (segundos) de volta para Date UTC para inspecionar
function paraData(unixSegundos: number): Date {
  return new Date(unixSegundos * 1000)
}

describe('proximoDiaDezUnix', () => {
  it('assinatura no início do mês (dia 3) → dia 10 do mês seguinte', () => {
    const data = paraData(proximoDiaDezUnix(new Date(Date.UTC(2026, 2, 3)))) // 3 de março
    expect(data.getUTCFullYear()).toBe(2026)
    expect(data.getUTCMonth()).toBe(3) // abril (0-based)
    expect(data.getUTCDate()).toBe(DIA_DA_COBRANCA)
  })

  it('assinatura no próprio dia 10 → dia 10 do mês seguinte (não cobra o mês vigente)', () => {
    const data = paraData(proximoDiaDezUnix(new Date(Date.UTC(2026, 5, 10)))) // 10 de junho
    expect(data.getUTCMonth()).toBe(6) // julho
    expect(data.getUTCDate()).toBe(10)
  })

  it('assinatura no fim do mês (dia 28) → dia 10 do mês seguinte', () => {
    const data = paraData(proximoDiaDezUnix(new Date(Date.UTC(2026, 5, 28)))) // 28 de junho
    expect(data.getUTCMonth()).toBe(6) // julho
    expect(data.getUTCDate()).toBe(10)
  })

  it('virada de ano: dezembro → dia 10 de janeiro do ano seguinte', () => {
    const data = paraData(proximoDiaDezUnix(new Date(Date.UTC(2026, 11, 15)))) // 15 de dezembro
    expect(data.getUTCFullYear()).toBe(2027)
    expect(data.getUTCMonth()).toBe(0) // janeiro
    expect(data.getUTCDate()).toBe(10)
  })

  it('sempre no futuro em relação à data de assinatura', () => {
    const agora = new Date(Date.UTC(2026, 4, 5))
    expect(proximoDiaDezUnix(agora) * 1000).toBeGreaterThan(agora.getTime())
  })
})

describe('primeiroDebitoVendaPresencial', () => {
  it('compra em 20/jul → 30 dias (≈19/ago) → ancora em 10/set', () => {
    const data = paraData(primeiroDebitoVendaPresencial(new Date(Date.UTC(2026, 6, 20)))) // 20 de julho
    expect(data.getUTCFullYear()).toBe(2026)
    expect(data.getUTCMonth()).toBe(8) // setembro (0-based)
    expect(data.getUTCDate()).toBe(DIA_DA_COBRANCA)
  })

  it('compra no início do mês (5/jul → ≈4/ago, ainda antes do dia 10) → 10/ago', () => {
    const data = paraData(primeiroDebitoVendaPresencial(new Date(Date.UTC(2026, 6, 5)))) // 5 de julho
    expect(data.getUTCMonth()).toBe(7) // agosto
    expect(data.getUTCDate()).toBe(10)
  })

  it('virada de ano: compra em 20/dez → +30 dias (≈19/jan) → 10/fev do ano seguinte', () => {
    const data = paraData(primeiroDebitoVendaPresencial(new Date(Date.UTC(2026, 11, 20)))) // 20 de dezembro
    expect(data.getUTCFullYear()).toBe(2027)
    expect(data.getUTCMonth()).toBe(1) // fevereiro
    expect(data.getUTCDate()).toBe(10)
  })

  it('a carência presencial é sempre mais tarde (ou igual) que a regra do autocadastro', () => {
    const compra = new Date(Date.UTC(2026, 6, 20)) // 20 de julho
    expect(primeiroDebitoVendaPresencial(compra)).toBeGreaterThan(proximoDiaDezUnix(compra))
  })
})
