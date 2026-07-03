// Chaves da sessão do admin no navegador — usadas pelo login, pelo logout e
// pelo tratamento global de sessão expirada (LGPD, Fase 4.2)

// Remove todas as chaves de sessão do admin do navegador
export function clearAdminSession() {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_store_slug')
  localStorage.removeItem('admin_store_name')
  localStorage.removeItem('admin_email_verified')
  // Limpa chaves legadas que versões anteriores salvavam
  localStorage.removeItem('admin_role')
  localStorage.removeItem('admin_is_super_admin')
}

// Sessão expirada ou revogada: limpa o navegador e volta para o login com um
// aviso. Chamada quando uma requisição autenticada do painel responde 401.
export function redirectToLoginSessionExpired() {
  clearAdminSession()
  window.location.href = '/admin/login?sessao=expirada'
}
