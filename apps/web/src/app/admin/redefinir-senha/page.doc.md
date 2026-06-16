# Redefinir Senha

Formulário para criar uma nova senha — o usuário chega aqui pelo link recebido por e-mail após solicitar a redefinição.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza o formulário com campos "Nova senha" e "Confirmar senha", mensagens de erro/sucesso e link para o login. Se o token estiver ausente na URL, exibe mensagem de link inválido. |
| `page.hooks.ts` | Lê o token da query string (`?token=xxx`), valida que as senhas coincidem e têm no mínimo 8 caracteres, e chama `authService.resetPassword` para efetivar a troca. |

## Fluxo de dados

`useSearchParams` extrai o `token` da URL → usuário preenche senha e confirmação → `handleSubmit` valida localmente (senhas iguais, mínimo 8 chars) → `authService.resetPassword(token, password)` envia para a API → em caso de sucesso, exibe mensagem e link para login.

## Estados gerenciados

| Estado | Tipo | Descrição |
|--------|------|-----------|
| `token` | `string` | Token de redefinição extraído da URL |
| `password` | `string` | Nova senha digitada |
| `confirmPassword` | `string` | Confirmação da nova senha |
| `success` | `boolean` | Indica se a senha foi redefinida com sucesso (troca o formulário por mensagem de sucesso) |
| `isLoading` | `boolean` | Indica se o submit está em andamento |
| `error` | `string \| null` | Mensagem de erro (validação local ou erro da API) |

## Ações do usuário

| Ação | Handler | O que faz |
|------|---------|-----------|
| Submeter o formulário | `handleSubmit` | Valida que as senhas coincidem e têm 8+ caracteres, chama `authService.resetPassword(token, password)`. Em caso de sucesso, exibe confirmação com link para login. |

## Módulos utilizados

- `@/modules/auth` — `authService` para `resetPassword`.
- `next/navigation` — `useSearchParams` para ler o token da URL.

## Observações

- Se o token não está presente na URL, a view exibe uma tela de "Link inválido" com link para solicitar um novo.
- A página não requer autenticação (não usa `useAdminAuth`), pois o usuário esqueceu a senha.
- Após o sucesso, a view troca o formulário por uma mensagem de confirmação e um botão "Ir para o login".
- A validação de senhas coincidentes acontece no frontend antes de chamar a API.
