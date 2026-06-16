# Esqueci Minha Senha

Formulário para solicitar um link de redefinição de senha por e-mail.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza o formulário com campo de e-mail e botão de envio. Após o envio, troca o formulário por uma mensagem de confirmação genérica (não revela se o e-mail existe). |
| `page.hooks.ts` | Gerencia o campo de e-mail, o estado de envio e o submit que chama `authService.forgotPassword`. |

## Fluxo de dados

Usuário preenche o e-mail → `handleSubmit` chama `authService.forgotPassword(email)` → API sempre retorna 200 (não revela se o e-mail existe) → hook marca `sent: true` → view troca o formulário pela mensagem de confirmação.

## Estados gerenciados

| Estado | Tipo | Descrição |
|--------|------|-----------|
| `email` | `string` | E-mail digitado pelo usuário |
| `sent` | `boolean` | Indica se o pedido foi enviado com sucesso (troca formulário por mensagem de confirmação) |
| `isLoading` | `boolean` | Indica se o submit está em andamento |
| `error` | `string \| null` | Mensagem de erro (apenas em caso de falha de rede/conexão) |

## Ações do usuário

| Ação | Handler | O que faz |
|------|---------|-----------|
| Submeter o formulário | `handleSubmit` | Chama `authService.forgotPassword(email.trim())`. Em caso de sucesso, exibe mensagem genérica de confirmação. |

## Módulos utilizados

- `@/modules/auth` — `authService` para `forgotPassword`.

## Observações

- A página não requer autenticação (não usa `useAdminAuth`).
- A mensagem de sucesso é deliberadamente genérica ("Se este e-mail estiver cadastrado, você receberá um link...") para não revelar se o e-mail existe no sistema — seguindo a mesma política da API.
- Inclui link "Voltar para o login" tanto no formulário quanto na mensagem de confirmação.
- Erros são exibidos apenas em caso de falha de conexão/rede, não quando o e-mail não existe.
