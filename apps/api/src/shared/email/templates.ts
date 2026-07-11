// Templates de e-mail — funções que retornam HTML pronto para enviar.
// Sem dependência de template engine — apenas template literals.

// Estilos inline reutilizados nos templates
const containerStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 480px;
  margin: 0 auto;
  padding: 40px 24px;
  color: #111827;
`

const buttonStyle = `
  display: inline-block;
  background-color: #111827;
  color: #ffffff;
  padding: 12px 32px;
  border-radius: 12px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
`

const footerStyle = `
  margin-top: 32px;
  font-size: 12px;
  color: #9ca3af;
`

// E-mail enviado quando o usuário pede para redefinir a senha
export function passwordResetEmail(resetUrl: string, storeName: string): string {
  return `
    <div style="${containerStyle}">
      <h2 style="font-size: 20px; margin-bottom: 16px;">Redefinir sua senha</h2>
      <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
        Recebemos um pedido para redefinir a senha da sua conta na loja
        <strong>${storeName}</strong>. Clique no botão abaixo para criar uma nova senha:
      </p>
      <div style="margin: 24px 0;">
        <a href="${resetUrl}" style="${buttonStyle}">Criar nova senha</a>
      </div>
      <p style="font-size: 13px; color: #9ca3af; line-height: 1.5;">
        Este link expira em <strong>1 hora</strong>. Se você não pediu para redefinir
        sua senha, ignore este e-mail — sua conta continua segura.
      </p>
      <p style="${footerStyle}">
        Esqueleton — ${storeName}
      </p>
    </div>
  `
}

// E-mail enviado após o cadastro para confirmar o endereço de e-mail
export function emailVerificationEmail(verifyUrl: string, storeName: string): string {
  return `
    <div style="${containerStyle}">
      <h2 style="font-size: 20px; margin-bottom: 16px;">Confirme seu e-mail</h2>
      <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
        Sua loja <strong>${storeName}</strong> foi criada com sucesso!
        Clique no botão abaixo para confirmar seu endereço de e-mail:
      </p>
      <div style="margin: 24px 0;">
        <a href="${verifyUrl}" style="${buttonStyle}">Confirmar e-mail</a>
      </div>
      <p style="font-size: 13px; color: #9ca3af; line-height: 1.5;">
        Este link expira em <strong>7 dias</strong>. Se você não criou esta conta,
        ignore este e-mail.
      </p>
      <p style="${footerStyle}">
        Esqueleton — ${storeName}
      </p>
    </div>
  `
}

// E-mail enviado logo após o pagamento da assinatura falhar — avisa o lojista
// que a loja saiu do ar e leva à tela de planos para regularizar
export function subscriptionPaymentFailedEmail(storeName: string, plansUrl: string): string {
  return `
    <div style="${containerStyle}">
      <h2 style="font-size: 20px; margin-bottom: 16px;">Pagamento não efetuado</h2>
      <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
        Não conseguimos processar o pagamento da assinatura da sua loja
        <strong>${storeName}</strong>. Por isso, ela está <strong>desativada</strong>
        e fora do ar para os seus clientes até o pagamento ser regularizado.
      </p>
      <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
        Verifique os dados do seu cartão e regularize a assinatura para colocar
        a loja de volta no ar — tudo o que você cadastrou continua guardado.
      </p>
      <div style="margin: 24px 0;">
        <a href="${plansUrl}" style="${buttonStyle}">Regularizar pagamento</a>
      </div>
      <p style="${footerStyle}">
        Esqueleton — ${storeName}
      </p>
    </div>
  `
}

// E-mail enviado ao dono de loja inativa (suspensa/cancelada há mais de 6 meses)
// avisando que a loja será excluída em 30 dias se não for reativada (LGPD, Fase 3.5)
export function storeDeletionWarningEmail(storeName: string, loginUrl: string): string {
  return `
    <div style="${containerStyle}">
      <h2 style="font-size: 20px; margin-bottom: 16px;">Sua loja será excluída em 30 dias</h2>
      <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
        Sua loja <strong>${storeName}</strong> está inativa há mais de 6 meses.
        Para proteger os dados pessoais que ela guarda, a Lei Geral de Proteção
        de Dados (LGPD) nos obriga a eliminar dados cuja finalidade acabou.
      </p>
      <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
        Se você não reativar a loja em <strong>30 dias</strong>, ela será excluída
        definitivamente — produtos, pedidos, clientes e imagens. Essa ação não
        pode ser desfeita.
      </p>
      <div style="margin: 24px 0;">
        <a href="${loginUrl}" style="${buttonStyle}">Reativar minha loja</a>
      </div>
      <p style="font-size: 13px; color: #9ca3af; line-height: 1.5;">
        Quer exportar seus dados antes? Acesse o painel e use
        <strong>Perfil da loja &rarr; Dados e conta &rarr; Exportar dados</strong>.
      </p>
      <p style="${footerStyle}">
        Esqueleton — ${storeName}
      </p>
    </div>
  `
}
