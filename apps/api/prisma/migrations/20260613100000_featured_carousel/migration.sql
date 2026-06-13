-- Adiciona flag de carrossel aos destaques
ALTER TABLE "Featured" ADD COLUMN "carousel" BOOLEAN NOT NULL DEFAULT false;
