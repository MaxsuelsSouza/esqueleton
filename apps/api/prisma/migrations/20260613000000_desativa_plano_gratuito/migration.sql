-- Modelo "pagou, usou": loja nova funciona 7 dias de teste e depois precisa de
-- assinatura paga. O plano gratuito deixa de ser oferecido para novas assinaturas
-- (active = false), mas as assinaturas gratuitas já existentes continuam valendo
-- (cortesia para as lojas criadas antes desta mudança).
UPDATE "Plan" SET "active" = false WHERE "priceInCents" = 0;
