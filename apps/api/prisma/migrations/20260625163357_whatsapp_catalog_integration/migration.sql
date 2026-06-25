-- AlterTable
ALTER TABLE "StoreProfile" ADD COLUMN     "metaAccessToken" TEXT,
ADD COLUMN     "metaCatalogId" TEXT,
ADD COLUMN     "metaWabaId" TEXT,
ADD COLUMN     "whatsappCatalogEnabled" BOOLEAN NOT NULL DEFAULT false;
