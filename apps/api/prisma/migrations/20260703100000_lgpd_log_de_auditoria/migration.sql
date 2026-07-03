-- LGPD (Fase 4.1): log de auditoria de ações sensíveis — quem, o quê, quando
-- e de qual IP. Sem chave estrangeira para Store de propósito: o registro da
-- exclusão de uma loja precisa sobreviver à exclusão dela.
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "storeId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_storeId_idx" ON "AuditLog"("storeId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
