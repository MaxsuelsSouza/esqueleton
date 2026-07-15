-- Migração do gateway de pagamento: MercadoPago → Stripe
-- Corte limpo (sem período de coexistência) — ver docs/plano-migracao-stripe.md
--
-- Idempotência do DROP (IF EXISTS): o banco de produção sofreu drift e NÃO tem as
-- colunas mercadoPago* (a migração que as criava foi marcada como aplicada sem de
-- fato criar as colunas). Um DROP COLUMN comum falharia lá ("column does not
-- exist"), marcaria esta migração como failed (P3009) e travaria todos os deploys
-- seguintes. Com IF EXISTS o DROP vira no-op quando a coluna não existe, e a
-- migração aplica limpo em qualquer estado do banco.
-- Os ADD COLUMN ficam sem guarda: são colunas novas, introduzidas por esta
-- migração, que não existem em nenhum banco alvo.

-- Store: customer estável do Stripe, reaproveitado em trocas de plano/cancelamento
ALTER TABLE "Store" ADD COLUMN "stripeCustomerId" TEXT;

-- Plan: Product + Price do Stripe no lugar do plano de recorrência do MercadoPago
ALTER TABLE "Plan" DROP COLUMN IF EXISTS "mercadoPagoPreapprovalPlanId";
ALTER TABLE "Plan" ADD COLUMN "stripeProductId" TEXT;
ALTER TABLE "Plan" ADD COLUMN "stripePriceId" TEXT;

-- Subscription: ID da assinatura recorrente no Stripe no lugar do preapproval do MercadoPago
ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "mercadoPagoPreapprovalId";
ALTER TABLE "Subscription" ADD COLUMN "stripeSubscriptionId" TEXT;
