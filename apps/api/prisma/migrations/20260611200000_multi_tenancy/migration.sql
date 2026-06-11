-- Multi-tenancy: cria a tabela Store (loja) e adiciona a coluna storeId em todas as
-- tabelas de dados. Os dados que já existem no banco são transferidos para uma
-- "loja inicial", criada a partir do StoreProfile atual. Em um banco vazio nenhuma
-- loja é criada — o cadastro de novas lojas acontece pela API.

-- 1. Tabela de lojas (tenants)
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");

-- 2. Adiciona a coluna storeId como opcional em todas as tabelas.
--    Ela vira obrigatória no passo 4, depois que os dados existentes forem preenchidos.
ALTER TABLE "User" ADD COLUMN "storeId" TEXT;
ALTER TABLE "Product" ADD COLUMN "storeId" TEXT;
ALTER TABLE "Category" ADD COLUMN "storeId" TEXT;
ALTER TABLE "Featured" ADD COLUMN "storeId" TEXT;
ALTER TABLE "Promotion" ADD COLUMN "storeId" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "storeId" TEXT;
ALTER TABLE "StoreProfile" ADD COLUMN "storeId" TEXT;
ALTER TABLE "Order" ADD COLUMN "storeId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "storeId" TEXT;
ALTER TABLE "ProductEvent" ADD COLUMN "storeId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "storeId" TEXT;

-- 3. Preenchimento (backfill): se o banco já tem dados, cria a loja inicial e
--    aponta todos os registros existentes para ela.
DO $$
DECLARE
  tem_dados boolean;
  nome_loja text;
  slug_loja text;
  id_loja text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM "User")
      OR EXISTS (SELECT 1 FROM "Product")
      OR EXISTS (SELECT 1 FROM "Category")
      OR EXISTS (SELECT 1 FROM "Featured")
      OR EXISTS (SELECT 1 FROM "Promotion")
      OR EXISTS (SELECT 1 FROM "Coupon")
      OR EXISTS (SELECT 1 FROM "StoreProfile")
      OR EXISTS (SELECT 1 FROM "Order")
      OR EXISTS (SELECT 1 FROM "Customer")
      OR EXISTS (SELECT 1 FROM "ProductEvent")
      OR EXISTS (SELECT 1 FROM "Notification")
    INTO tem_dados;

  IF tem_dados THEN
    -- O nome da loja vem do perfil já configurado; sem perfil, usa o padrão
    SELECT "storeName" INTO nome_loja FROM "StoreProfile" WHERE "id" = 'singleton';
    IF nome_loja IS NULL OR trim(nome_loja) = '' THEN
      nome_loja := 'Minha Loja';
    END IF;

    -- Slug derivado do nome: minúsculas, e tudo que não é letra ou número vira hífen
    slug_loja := trim(both '-' from regexp_replace(lower(nome_loja), '[^a-z0-9]+', '-', 'g'));
    IF slug_loja = '' THEN
      slug_loja := 'minha-loja';
    END IF;

    id_loja := 'loja-inicial-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12);

    INSERT INTO "Store" ("id", "slug", "name", "status", "createdAt", "updatedAt")
    VALUES (id_loja, slug_loja, nome_loja, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    UPDATE "User" SET "storeId" = id_loja;
    UPDATE "Product" SET "storeId" = id_loja;
    UPDATE "Category" SET "storeId" = id_loja;
    UPDATE "Featured" SET "storeId" = id_loja;
    UPDATE "Promotion" SET "storeId" = id_loja;
    UPDATE "Coupon" SET "storeId" = id_loja;
    UPDATE "StoreProfile" SET "storeId" = id_loja;
    UPDATE "Order" SET "storeId" = id_loja;
    UPDATE "Customer" SET "storeId" = id_loja;
    UPDATE "ProductEvent" SET "storeId" = id_loja;
    UPDATE "Notification" SET "storeId" = id_loja;
  END IF;
END $$;

-- 4. Agora que tudo está preenchido, a coluna vira obrigatória
ALTER TABLE "User" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "Featured" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "Promotion" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "Coupon" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "StoreProfile" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "ProductEvent" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "storeId" SET NOT NULL;

-- 5. Chaves estrangeiras — excluir uma loja apaga todos os seus dados em cascata
ALTER TABLE "User" ADD CONSTRAINT "User_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Featured" ADD CONSTRAINT "Featured_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreProfile" ADD CONSTRAINT "StoreProfile_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductEvent" ADD CONSTRAINT "ProductEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Índices únicos que eram globais passam a ser "únicos por loja"
DROP INDEX "Coupon_code_key";
CREATE UNIQUE INDEX "Coupon_storeId_code_key" ON "Coupon"("storeId", "code");

DROP INDEX "Customer_phone_key";
CREATE UNIQUE INDEX "Customer_storeId_phone_key" ON "Customer"("storeId", "phone");

DROP INDEX "Order_orderNumber_key";
DROP INDEX "Order_orderNumber_idx";
CREATE UNIQUE INDEX "Order_storeId_orderNumber_key" ON "Order"("storeId", "orderNumber");

DROP INDEX "Notification_type_entityId_key";
CREATE UNIQUE INDEX "Notification_storeId_type_entityId_key" ON "Notification"("storeId", "type", "entityId");

-- 7. Perfil da loja deixa de ser um registro único do sistema ("singleton")
--    e passa a ser um registro por loja
ALTER TABLE "StoreProfile" ALTER COLUMN "id" DROP DEFAULT;
CREATE UNIQUE INDEX "StoreProfile_storeId_key" ON "StoreProfile"("storeId");

-- 8. Índices de busca por loja — toda consulta filtra por storeId
CREATE INDEX "User_storeId_idx" ON "User"("storeId");
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");
CREATE INDEX "Category_storeId_idx" ON "Category"("storeId");
CREATE INDEX "Featured_storeId_idx" ON "Featured"("storeId");
CREATE INDEX "Promotion_storeId_idx" ON "Promotion"("storeId");
CREATE INDEX "Coupon_storeId_idx" ON "Coupon"("storeId");
CREATE INDEX "Order_storeId_idx" ON "Order"("storeId");
CREATE INDEX "Customer_storeId_idx" ON "Customer"("storeId");
CREATE INDEX "ProductEvent_storeId_idx" ON "ProductEvent"("storeId");
CREATE INDEX "Notification_storeId_idx" ON "Notification"("storeId");
