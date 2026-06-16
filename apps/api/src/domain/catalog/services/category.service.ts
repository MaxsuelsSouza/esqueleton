// Lógica de negócio de categorias — exclusão recursiva em árvore (BFS)
import type { PrismaClient } from '@prisma/client'

// Coleta todos os IDs descendentes de uma categoria usando busca em largura (BFS).
// Necessário para apagar uma categoria e todas as suas filhas de uma vez.
export async function collectDescendantIds(
  prisma: PrismaClient,
  rootId: string,
  storeId: string,
): Promise<string[]> {
  const allIds: string[] = []
  let currentLevel = [rootId]

  while (currentLevel.length > 0) {
    allIds.push(...currentLevel)
    const children = await prisma.category.findMany({
      where: { parentId: { in: currentLevel }, storeId },
      select: { id: true },
    })
    currentLevel = children.map((c) => c.id)
  }

  return allIds
}
