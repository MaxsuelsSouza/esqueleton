// Rede de segurança do multi-tenancy: toda consulta a dados de loja PRECISA
// dizer de qual loja é (storeId). Um esquecimento vazaria dados de um cliente
// para outro — por isso este guard envolve o Prisma e LANÇA ERRO quando uma
// consulta chega sem storeId, em vez de deixá-la passar.
//
// Vale também em produção: é melhor uma rota falhar com erro do que devolver
// dados da loja errada. O guard não injeta o filtro automaticamente de propósito —
// cada rota escreve o próprio storeId, mantendo o código explícito e legível.
import type { PrismaClient } from '@prisma/client'

// Modelos que pertencem a uma loja (nome da propriedade no Prisma Client).
// "user" fica de fora: o login busca por email, que é único no sistema inteiro.
// "store" fica de fora: é a própria tabela de lojas.
const MODELOS_DE_LOJA = new Set([
  'product',
  'category',
  'featured',
  'promotion',
  'coupon',
  'storeProfile',
  'order',
  'customer',
  'productEvent',
  'notification',
  'subscription',
])

// Operações que leem ou alteram dados e por isso precisam do filtro por loja
const OPERACOES_COM_FILTRO = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
])

// Procura a chave storeId em qualquer nível do objeto — cobre tanto o filtro
// direto ({ storeId }) quanto chaves compostas (ex: { storeId_code: { storeId, code } })
function contemStoreId(valor: unknown): boolean {
  if (!valor || typeof valor !== 'object') return false
  const objeto = valor as Record<string, unknown>
  if ('storeId' in objeto) return true
  return Object.values(objeto).some((interno) => contemStoreId(interno))
}

// Confere se a operação informou a loja — lança erro explicando o que faltou
function verificaOperacao(modelo: string, operacao: string, argumentos: unknown) {
  const args = (argumentos ?? {}) as Record<string, unknown>

  if (operacao === 'create') {
    if (!contemStoreId(args.data)) {
      throw new Error(`Criação sem loja: ${modelo}.create precisa de storeId em data`)
    }
    return
  }

  if (operacao === 'createMany') {
    const itens = Array.isArray(args.data) ? args.data : [args.data]
    if (!itens.every(contemStoreId)) {
      throw new Error(`Criação sem loja: todo item de ${modelo}.createMany precisa de storeId`)
    }
    return
  }

  if (operacao === 'upsert') {
    if (!contemStoreId(args.where) || !contemStoreId(args.create)) {
      throw new Error(`Consulta sem loja: ${modelo}.upsert precisa de storeId em where e em create`)
    }
    return
  }

  if (OPERACOES_COM_FILTRO.has(operacao)) {
    if (!contemStoreId(args.where)) {
      throw new Error(`Consulta sem loja: ${modelo}.${operacao} precisa de storeId em where`)
    }
  }
}

// Envolve um modelo do Prisma (ex: prisma.product) para conferir cada chamada
function protegeModelo(modelo: object, nomeModelo: string): object {
  return new Proxy(modelo, {
    get(alvo, propriedade) {
      const valor = Reflect.get(alvo, propriedade)
      if (typeof propriedade !== 'string' || typeof valor !== 'function') return valor
      return (...argumentos: unknown[]) => {
        verificaOperacao(nomeModelo, propriedade, argumentos[0])
        return (valor as (...a: unknown[]) => unknown).apply(alvo, argumentos)
      }
    },
  })
}

// Envolve o Prisma Client inteiro. Funciona tanto com o cliente real quanto com
// o banco falso dos testes — por isso os testes também pegam consultas sem storeId.
export function comProtecaoDeLoja(prisma: PrismaClient): PrismaClient {
  const protegido: PrismaClient = new Proxy(prisma, {
    get(alvo, propriedade, receptor) {
      const valor = Reflect.get(alvo, propriedade, receptor)

      // Modelos de loja ganham a verificação em cada operação
      if (
        typeof propriedade === 'string' &&
        MODELOS_DE_LOJA.has(propriedade) &&
        valor &&
        typeof valor === 'object'
      ) {
        return protegeModelo(valor as object, propriedade)
      }

      // Transações com função recebem o cliente da transação também protegido
      if (propriedade === '$transaction' && typeof valor === 'function') {
        return (...argumentos: unknown[]) => {
          const [primeiro, ...resto] = argumentos
          if (typeof primeiro === 'function') {
            const callbackProtegido = (tx: PrismaClient) =>
              (primeiro as (tx: PrismaClient) => unknown)(comProtecaoDeLoja(tx))
            return (valor as (...a: unknown[]) => unknown).call(alvo, callbackProtegido, ...resto)
          }
          return (valor as (...a: unknown[]) => unknown).apply(alvo, argumentos)
        }
      }

      // Demais métodos do cliente ($connect, $disconnect etc.) passam direto
      if (typeof valor === 'function') {
        return (valor as (...a: unknown[]) => unknown).bind(alvo)
      }
      return valor
    },
  }) as PrismaClient

  return protegido
}
