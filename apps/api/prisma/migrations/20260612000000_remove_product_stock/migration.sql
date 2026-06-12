-- Remove o controle de estoque: o lojista controla estoque no sistema dele,
-- o site passa a ser apenas catálogo e pedidos.

-- Apaga as notificações de estoque já criadas (os tipos deixam de existir)
DELETE FROM "Notification" WHERE "type" IN ('LOW_STOCK', 'OUT_OF_STOCK');

-- Remove a coluna de quantidade em estoque do produto
ALTER TABLE "Product" DROP COLUMN "stock";
