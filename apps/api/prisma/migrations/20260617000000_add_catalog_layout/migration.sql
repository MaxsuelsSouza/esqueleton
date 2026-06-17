-- Adiciona campo de configuração visual do catálogo público ao perfil da loja.
-- null = layout padrão (comportamento atual, sem alteração para lojas existentes).
ALTER TABLE "StoreProfile" ADD COLUMN "catalogLayout" JSONB;
