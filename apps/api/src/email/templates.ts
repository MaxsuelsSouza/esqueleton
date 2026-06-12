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
