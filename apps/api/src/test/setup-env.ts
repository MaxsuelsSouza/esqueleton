// Isola os testes do mundo externo.
//
// O @prisma/client carrega o arquivo .env do desenvolvedor no momento em que é
// importado — se ele tiver chaves reais (Resend, R2, MercadoPago, Redis), os
// testes tentariam enviar e-mail de verdade, subir imagem para o R2 e falar com
// serviços externos. Isso deixa os testes lentos, instáveis e com efeitos
// colaterais reais.
//
// Por isso o import abaixo vem PRIMEIRO: força o Prisma a carregar o .env já,
// para que a limpeza logo em seguida remova as chaves antes de qualquer teste
// subir o app. Cada integração então cai no seu modo "sem credencial":
// e-mail vira no-op logado, storage fica null (imagem base64 passa direto),
// MercadoPago vira no-op e o rate limit usa contadores em memória.
import '@prisma/client'

const VARIAVEIS_DE_INTEGRACAO = [
  'RESEND_API_KEY',
  'MERCADOPAGO_ACCESS_TOKEN',
  'MERCADOPAGO_WEBHOOK_SECRET',
  'REDIS_URL',
]

for (const nome of VARIAVEIS_DE_INTEGRACAO) {
  delete process.env[nome]
}

// Todas as credenciais do Cloudflare R2 (R2_ACCOUNT_ID, R2_BUCKET_NAME, ...)
for (const nome of Object.keys(process.env)) {
  if (nome.startsWith('R2_')) {
    delete process.env[nome]
  }
}
