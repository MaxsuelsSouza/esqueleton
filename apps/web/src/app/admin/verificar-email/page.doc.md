# Verificar E-mail

Página de verificação de e-mail — acionada automaticamente quando o usuário clica no link recebido por e-mail após o cadastro.

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza três estados visuais: loading (spinner), sucesso (ícone verde + aviso sobre ativação da loja + links para assinar ou ir ao painel) e erro (ícone vermelho + mensagem + link para login). |
| `page.hooks.ts` | Lê o token da query string, envia um POST para `/api/auth/verify-email` ao montar o componente e atualiza `admin_email_verified` no localStorage em caso de sucesso. |

## Fluxo de dados

`useSearchParams` extrai o `token` da URL → `useEffect` dispara no mount → `fetch` POST para `{API_URL}/api/auth/verify-email` com o token → se `res.ok`, marca `status: 'success'` e atualiza localStorage → view renderiza o estado correspondente.

## Estados gerenciados

| Estado | Tipo | Descrição |
|--------|------|-----------|
| `status` | `'loading' \| 'success' \| 'error'` | Estado atual da verificação (carregando, sucesso ou erro) |
| `message` | `string` | Mensagem exibida ao usuário (sucesso ou erro) |

## Ações do usuário

| Ação | Handler | O que faz |
|------|---------|-----------|
| Acessar a página (automático) | `useEffect` no hook | Envia o token para a API verificar o e-mail. Não há ação manual do usuário para iniciar a verificação. |
| Clicar em "Ativar minha loja" | — | Navega para `/admin/assinatura` (link estático). |
| Clicar em "Deixar para depois" | — | Navega para `/admin/dashboard` (link estático). |

## Módulos utilizados

- `next/navigation` — `useSearchParams` para ler o token da URL.

## Observações

- O hook faz a chamada HTTP diretamente com `fetch` em vez de usar um service. Usa `process.env.NEXT_PUBLIC_API_URL` para montar a URL da API.
- Ao verificar com sucesso, atualiza `admin_email_verified` para `'true'` no localStorage, fazendo o banner de verificação desaparecer ao voltar ao painel.
- A tela de sucesso inclui um aviso (laranja) sobre o período de teste de 7 dias e a necessidade de ativar a assinatura, com botão principal levando a `/admin/assinatura`.
- Se o token está ausente ou inválido, exibe mensagem de erro com link para o login.
- A página não requer autenticação (não usa `useAdminAuth`).
