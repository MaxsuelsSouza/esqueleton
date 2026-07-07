-- Índice composto para o teto diário de eventos por loja — a contagem
-- "eventos da loja desde a meia-noite" precisa dele para não varrer
-- todo o histórico de eventos da loja a cada verificação
CREATE INDEX "ProductEvent_storeId_createdAt_idx" ON "ProductEvent"("storeId", "createdAt");
