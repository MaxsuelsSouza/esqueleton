-- LGPD (Fase 3.5): registra quando o dono de uma loja inativa (suspensa ou
-- cancelada há mais de 6 meses) foi avisado da exclusão. Sem reativação em
-- 30 dias após o aviso, o job de limpeza exclui a loja definitivamente.
ALTER TABLE "Store" ADD COLUMN "deletionWarnedAt" TIMESTAMP(3);
