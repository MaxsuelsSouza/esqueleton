-- LGPD (Fase 1.2): registra quando e qual versão dos Termos de Uso /
-- Política de Privacidade o usuário aceitou no cadastro da loja
ALTER TABLE "User" ADD COLUMN "acceptedTermsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "acceptedTermsVersion" TEXT;
