// ─────────────────────────────────────────────────────────────────────────────
// VALIDAÇÃO DO COMMIT 324b937 — "chore: corrigir CVEs via upgrade de dependências"
//
// Duas frentes conferidas aqui:
//
// 1) Fase 1 — rate-limit resistente a spoofing de cabeçalho (CVE-2026-3635):
//    resolveClientKey deve priorizar cabeçalhos que só a plataforma escreve
//    (x-vercel-forwarded-for, x-real-ip) e ignorar o x-forwarded-for forjável.
//
// 2) Fases 2–4 — o upgrade das dependências EOL realmente aterrissou:
//    Fastify 5, Next 15 + React 19, Prisma 6, Vitest 3, override do Vite 6.
//    Confere as versões declaradas nos package.json (a regressão silenciosa
//    seria alguém reverter um pin sem querer).
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { FastifyRequest } from 'fastify'
import { resolveClientKey } from '../../shared/security/client-ip'

// Monta um request mínimo com só o que a função lê
function fakeRequest(headers: Record<string, string | string[]>, ip = '9.9.9.9'): FastifyRequest {
  return { headers, ip } as unknown as FastifyRequest
}

// Lê a major version de um range do package.json (ex.: "^5.9.0" → 5)
function major(range: string | undefined): number {
  if (!range) return NaN
  const semver = range.replace(/^[\^~>=<\s]+/, '')
  return Number(semver.split('.')[0])
}

// A pasta de trabalho ao rodar os testes da API é apps/api
const apiPkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))
const webPkg = JSON.parse(readFileSync(resolve(process.cwd(), '../web/package.json'), 'utf8'))
const rootPkg = JSON.parse(readFileSync(resolve(process.cwd(), '../../package.json'), 'utf8'))

// ─────────────────────────────────────────────────────────────────────────────
describe('324b937 · Fase 1 — resolveClientKey resiste a spoofing de IP', () => {
  it('ATAQUE: x-forwarded-for forjado é ignorado quando há cabeçalho da Vercel', () => {
    const request = fakeRequest({
      'x-vercel-forwarded-for': '203.0.113.10', // IP real, escrito pela plataforma
      'x-forwarded-for': '6.6.6.6', // tentativa do atacante de trocar de "identidade"
    })
    expect(resolveClientKey(request)).toBe('203.0.113.10')
  })

  it('ATAQUE: sem cabeçalho da Vercel, x-real-ip vence o x-forwarded-for forjado', () => {
    const request = fakeRequest({
      'x-real-ip': '198.51.100.7',
      'x-forwarded-for': '6.6.6.6',
    })
    expect(resolveClientKey(request)).toBe('198.51.100.7')
  })

  it('DEV/VPS: sem cabeçalhos da plataforma, cai para request.ip', () => {
    const request = fakeRequest({ 'x-forwarded-for': '1.2.3.4' }, '10.0.0.1')
    expect(resolveClientKey(request)).toBe('10.0.0.1')
  })

  it('LISTA: pega só o primeiro IP de "cliente, proxy1, proxy2"', () => {
    const request = fakeRequest({ 'x-vercel-forwarded-for': '203.0.113.10, 70.41.3.18, 150.172.238.178' })
    expect(resolveClientKey(request)).toBe('203.0.113.10')
  })

  it('ROBUSTEZ: cabeçalho vazio/em branco não vira uma chave de rate-limit vazia', () => {
    const request = fakeRequest({ 'x-vercel-forwarded-for': '   ', 'x-real-ip': '198.51.100.7' })
    expect(resolveClientKey(request)).toBe('198.51.100.7')
  })

  it('ROBUSTEZ: dois atacantes forjando o MESMO x-forwarded-for continuam separados pelo IP real', () => {
    const a = fakeRequest({ 'x-vercel-forwarded-for': '203.0.113.10', 'x-forwarded-for': 'spoof' })
    const b = fakeRequest({ 'x-vercel-forwarded-for': '203.0.113.99', 'x-forwarded-for': 'spoof' })
    expect(resolveClientKey(a)).not.toBe(resolveClientKey(b))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('324b937 · Fases 2–4 — upgrades de dependência realmente aplicados', () => {
  it('API: Fastify na major 5 (cobre CVE-2026-3635/25223/25224/3419/33806)', () => {
    expect(major(apiPkg.dependencies.fastify)).toBe(5)
  })

  it('API: plugins do Fastify na major compatível com o v5', () => {
    expect(major(apiPkg.dependencies['@fastify/cors'])).toBe(11)
    expect(major(apiPkg.dependencies['@fastify/helmet'])).toBe(13)
    expect(major(apiPkg.dependencies['@fastify/jwt'])).toBe(10)
    expect(major(apiPkg.dependencies['@fastify/rate-limit'])).toBe(10)
    expect(major(apiPkg.dependencies['fastify-plugin'])).toBe(5)
  })

  it('API: Prisma (client e CLI) na major 6', () => {
    expect(major(apiPkg.dependencies['@prisma/client'])).toBe(6)
    expect(major(apiPkg.devDependencies.prisma)).toBe(6)
  })

  it('API: Vitest na major 3', () => {
    expect(major(apiPkg.devDependencies.vitest)).toBe(3)
  })

  it('WEB: Next 15 + React 19 (cobre a série de CVEs 2026-445xx)', () => {
    const deps = { ...webPkg.dependencies, ...webPkg.devDependencies }
    expect(major(deps.next)).toBe(15)
    expect(major(deps.react)).toBe(19)
    expect(major(deps['react-dom'])).toBe(19)
  })

  it('RAIZ: override do Vite ^6 presente (patcha GHSA-fx2h-pf6j-xcff, HIGH transitivo)', () => {
    const overrides = rootPkg.pnpm?.overrides ?? rootPkg.overrides ?? {}
    expect(major(overrides.vite)).toBe(6)
  })
})
