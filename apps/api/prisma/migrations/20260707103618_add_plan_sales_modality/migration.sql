-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "salesModality" TEXT NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "setupFeeInCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "setupFeeConfirmedAt" TIMESTAMP(3);
