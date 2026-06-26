-- Marca se o usuário deve trocar a senha no próximo login (senha temporária)
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
