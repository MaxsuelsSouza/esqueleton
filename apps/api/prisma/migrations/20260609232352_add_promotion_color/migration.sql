-- CreateTable
CREATE TABLE "StoreProfile" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "storeName" TEXT NOT NULL DEFAULT 'Minha Loja',
    "address" TEXT,
    "whatsapp" TEXT,
    "instagram" TEXT,
    "logoUrl" TEXT,
    "themeColor" TEXT NOT NULL DEFAULT '#000000',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreProfile_pkey" PRIMARY KEY ("id")
);
