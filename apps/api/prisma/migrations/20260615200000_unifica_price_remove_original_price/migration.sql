-- Unifica as colunas price e originalPrice do Product em uma única coluna price.
-- originalPrice contém o preço real cadastrado pelo lojista; price era sobrescrito
-- em memória pelas promoções. Agora price passa a ser o único campo.

-- 1. Garante que nenhum produto fique sem preço: copia price para originalPrice onde estiver NULL
UPDATE "Product" SET "originalPrice" = price WHERE "originalPrice" IS NULL;

-- 2. Substitui price pelo valor de originalPrice (o preço cadastrado real)
UPDATE "Product" SET price = "originalPrice";

-- 3. Remove a coluna originalPrice — agora redundante
ALTER TABLE "Product" DROP COLUMN "originalPrice";
