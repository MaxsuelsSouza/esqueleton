-- Super-admin da plataforma: flag no usuário, definida manualmente no banco.
-- Ex: UPDATE "User" SET "isSuperAdmin" = true WHERE email = 'voce@dominio.com';
ALTER TABLE "User" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
