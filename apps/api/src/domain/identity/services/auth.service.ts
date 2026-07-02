// Operações de identidade — criação de lojas e membros da equipe.
// Recebe PrismaClient e dados já validados; não conhece HTTP nem JWT.
import type { PrismaClient } from '@prisma/client'

type RegisterStoreParams = {
  email: string
  hashedPassword: string
  storeName: string
  storeSlug: string
  whatsapp: string
}

type RegisterStoreResult = {
  store: { id: string; slug: string; name: string }
  user: { id: string; email: string; role: string; storeId: string; createdAt: Date }
}

// Cria a loja, o perfil e o primeiro usuário (OWNER) em uma transação única —
// se qualquer parte falhar, nada é criado
export async function registerStore(
  prisma: PrismaClient,
  params: RegisterStoreParams,
): Promise<RegisterStoreResult> {
  return prisma.$transaction(async (tx) => {
    const store = await tx.store.create({
      data: { slug: params.storeSlug, name: params.storeName },
    })
    await tx.storeProfile.create({
      data: { storeId: store.id, storeName: params.storeName, whatsapp: params.whatsapp },
    })
    const user = await tx.user.create({
      data: {
        email: params.email,
        password: params.hashedPassword,
        storeId: store.id,
        role: 'OWNER',
      },
      select: { id: true, email: true, role: true, storeId: true, createdAt: true },
    })
    return { store, user }
  })
}

type RegisterStaffParams = {
  email: string
  hashedPassword: string
  storeId: string
  name?: string
}

// Cria um novo membro da equipe (STAFF) em uma loja existente
// A senha informada é temporária — o membro deve trocá-la no primeiro login
export async function registerStaff(
  prisma: PrismaClient,
  params: RegisterStaffParams,
): Promise<{ id: string; email: string; name: string | null; role: string; mustChangePassword: boolean; storeId: string; createdAt: Date }> {
  return prisma.user.create({
    data: {
      email: params.email,
      password: params.hashedPassword,
      storeId: params.storeId,
      role: 'STAFF',
      name: params.name,
      mustChangePassword: true,
    },
    select: { id: true, email: true, name: true, role: true, mustChangePassword: true, storeId: true, createdAt: true },
  })
}
