// Verificação de promoções, cupons e destaques expirados — cria notificações automaticamente
import type { PrismaClient } from '@prisma/client'

export async function checkExpiredEntities(prisma: PrismaClient, storeId: string): Promise<number> {
  const now = new Date()
  // Data e hora no formato UTC — mesmo formato armazenado no banco ("YYYY-MM-DD" e "HH:MM")
  const today = now.toISOString().slice(0, 10)
  const currentTime = now.toISOString().slice(11, 16)

  const [promotions, coupons, featured] = await Promise.all([
    prisma.promotion.findMany({ where: { storeId, active: true } }),
    prisma.coupon.findMany({ where: { storeId, active: true } }),
    prisma.featured.findMany({ where: { storeId, active: true } }),
  ])

  // Promoção está expirada se a data de término já passou, ou se terminou hoje antes do horário atual
  const expiredPromotions = promotions.filter((p) => {
    if (!p.endDate) return false
    if (p.endDate < today) return true
    if (p.endDate === today && p.endTime && p.endTime < currentTime) return true
    return false
  })

  // Cupom está expirado se a data passou, ou se atingiu o limite de usos
  const expiredCoupons = coupons.filter((c) => {
    if (c.endDate && c.endDate < today) return true
    if (c.maxUses !== null && c.usedCount >= c.maxUses) return true
    return false
  })

  // Destaque está expirado se a data de término já passou, ou se terminou hoje antes do horário atual
  const expiredFeatured = featured.filter((f) => {
    if (!f.endDate) return false
    if (f.endDate < today) return true
    if (f.endDate === today && f.endTime && f.endTime < currentTime) return true
    return false
  })

  // Cria todas as notificações de expiração de uma vez — skipDuplicates evita re-criar as já existentes
  const toCreate = [
    ...expiredPromotions.map((p) => ({
      storeId,
      type: 'PROMOTION_ENDED',
      title: `Promoção "${p.name}" expirou`,
      body: `Encerrou em ${p.endDate}${p.endTime ? ` às ${p.endTime}` : ''}`,
      entityId: p.id,
    })),
    ...expiredCoupons.map((c) => ({
      storeId,
      type: 'COUPON_ENDED',
      title: `Cupom "${c.code}" encerrado`,
      body: (c.maxUses !== null && c.usedCount >= c.maxUses)
        ? `Limite de ${c.maxUses} uso${c.maxUses === 1 ? '' : 's'} atingido`
        : `Expirou em ${c.endDate}`,
      entityId: c.id,
    })),
    ...expiredFeatured.map((f) => ({
      storeId,
      type: 'FEATURED_ENDED',
      title: `Destaque "${f.title}" expirou`,
      body: `Encerrou em ${f.endDate}${f.endTime ? ` às ${f.endTime}` : ''}`,
      entityId: f.id,
    })),
  ]

  const result = await prisma.notification.createMany({ data: toCreate, skipDuplicates: true })
  return result.count
}
