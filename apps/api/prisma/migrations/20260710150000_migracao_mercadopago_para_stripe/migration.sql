-- Migração do gateway de pagamento: MercadoPago → Stripe
-- Corte limpo (sem período de coexistência) — ver docs/plano-migracao-stripe.md

-- Store: customer estável do Stripe, reaproveitado em trocas de plano/cancelamento
ALTER TABLE "Store" ADD COLUMN "stripeCustomerId" TEXT;

-- Plan: Product + Price do Stripe no lugar do plano de recorrência do MercadoPago
ALTER TABLE "Plan" DROP COLUMN "mercadoPagoPreapprovalPlanId";
ALTER TABLE "Plan" ADD COLUMN "stripeProductId" TEXT;
ALTER TABLE "Plan" ADD COLUMN "stripePriceId" TEXT;

-- Subscription: ID da assinatura recorrente no Stripe no lugar do preapproval do MercadoPago
ALTER TABLE "Subscription" DROP COLUMN "mercadoPagoPreapprovalId";
ALTER TABLE "Subscription" ADD COLUMN "stripeSubscriptionId" TEXT;
