-- CreateTable
CREATE TABLE "ProductEvent" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "promotionId" TEXT,
    "promotionName" TEXT,
    "couponCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductEvent_productId_idx" ON "ProductEvent"("productId");

-- CreateIndex
CREATE INDEX "ProductEvent_eventType_idx" ON "ProductEvent"("eventType");

-- CreateIndex
CREATE INDEX "ProductEvent_createdAt_idx" ON "ProductEvent"("createdAt");
