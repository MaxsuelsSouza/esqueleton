# QA — Reset de Senha

**Commits relacionados:** `5cc20e2`
**Data:** 2026-06-12

## Descrição

Fluxo de "Esqueci minha senha" com envio de e-mail via Resend. O usuário solicita um link de redefinição, recebe por e-mail, e define uma nova senha. O token expira em 1 hora e é de uso único.

## Pré-condições

- Usuário cadastrado com e-mail válido
- `RESEND_API_KEY` configurada (ou verificar logs — sem a key, e-mails são apenas logados)

## Casos de Teste

### CT-01: Solicitar reset com e-mail existente
1. Acessar `/admin/esqueci-senha`
2. Preencher e-mail cadastrado
3. Clicar em "Enviar"
4. **Esperado:** Mensagem "Se o e-mail estiver cadastrado, você receberá um link" (sempre 200). Token `PasswordResetToken` criado no banco (32 bytes hex, validade 1h). E-mail enviado via Resend.

### CT-02: Solicitar reset com e-mail inexistente
1. Preencher e-mail que não existe
2. **Esperado:** Mesma mensagem de sucesso (não revela se o e-mail existe). Nenhum token criado.

### CT-03: Redefinir senha com token válido
1. Acessar `/admin/redefinir-senha?token=<token_valido>`
2. Preencher nova senha
3. **Esperado:** Senha atualizada. Token marcado como usado. Redirect para login.

### CT-04: Token expirado (>1h)
1. Usar token com mais de 1 hora
2. **Esperado:** Erro "Token expirado ou inválido".

### CT-05: Token já usado
1. Usar token que já foi utilizado para redefinir senha
2. **Esperado:** Erro — token inválido.

### CT-06: Nova solicitação apaga tokens anteriores
1. Solicitar reset duas vezes para o mesmo e-mail
2. **Esperado:** Tokens anteriores do usuário são deletados. Apenas o novo funciona.

### CT-07: Rate limit
1. Fazer 4 solicitações de reset em menos de 1 minuto
2. **Esperado:** Bloqueado após 3 tentativas (429).

### CT-08: Reset de senha — rate limit do endpoint de redefinição
1. Fazer 6 tentativas de `POST /api/auth/reset-password` em 1 minuto
2. **Esperado:** Bloqueado após 5 tentativas.

## Validações de API

| Endpoint | Método | Rate Limit |
|----------|--------|------------|
| `/api/auth/forgot-password` | POST | 3/min |
| `/api/auth/reset-password` | POST | 5/min |

## Observações

- O modelo `PasswordResetToken` **não tem storeId** — lookup global por token.
- Sem `RESEND_API_KEY`, o e-mail é logado no console (útil para dev/QA).

## Critérios de Aceite

- [ ] Endpoint sempre retorna 200 (não revela existência do e-mail)
- [ ] Token expira em 1 hora
- [ ] Token é de uso único
- [ ] Tokens anteriores são deletados ao solicitar novo
- [ ] Rate limiting funciona em ambos endpoints
