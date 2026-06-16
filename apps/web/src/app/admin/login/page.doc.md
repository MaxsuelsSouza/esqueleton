# Login

Tela de autenticação da área administrativa, com dois modos: login em conta existente e criação de loja nova (signup SaaS).

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `page.tsx` | Renderiza o formulário de login/cadastro com campos condicionais (nome e endereço da loja aparecem apenas no modo registro), mensagem de erro e link para "Esqueci minha senha". |
| `page.hooks.ts` | Gerencia o modo (login/register), os campos do formulário, a sugestão automática de slug a partir do nome da loja, o submit (cadastro + login ou só login) e o salvamento da sessão no localStorage. |

## Fluxo de dados

Modo login: usuário preenche e-mail e senha → `authService.login({ email, password })` → resposta salva no localStorage (`admin_token`, `admin_store_slug`, `admin_store_name`, `admin_email_verified`) → redireciona para `/admin/produtos`.

Modo register: usuário preenche nome, endereço, e-mail e senha → `authService.registerStore(...)` cria loja + perfil + usuário → `authService.login(...)` autentica → salva sessão → redireciona para `/admin/produtos`.

## Estados gerenciados

| Estado | Tipo | Descrição |
|--------|------|-----------|
| `mode` | `'login' \| 'register'` | Modo atual do formulário (login ou criação de loja) |
| `email` | `string` | E-mail digitado pelo usuário |
| `password` | `string` | Senha digitada pelo usuário |
| `storeName` | `string` | Nome da loja (apenas no modo register) |
| `storeSlug` | `string` | Endereço (slug) da loja (apenas no modo register) |
| `slugEditedManually` | `boolean` | Indica se o usuário editou o slug manualmente (interrompe a sugestão automática) |
| `error` | `string \| null` | Mensagem de erro exibida ao usuário |
| `isLoading` | `boolean` | Indica se o submit está em andamento |

## Ações do usuário

| Ação | Handler | O que faz |
|------|---------|-----------|
| Digitar o nome da loja | `handleStoreNameChange` | Atualiza `storeName` e sugere o slug automaticamente (ex: "Perfumaria Ana" gera "perfumaria-ana"), a menos que o slug tenha sido editado manualmente. |
| Digitar o endereço da loja | `handleStoreSlugChange` | Atualiza `storeSlug`, normaliza para formato de slug valido e marca como editado manualmente. |
| Submeter o formulário | `handleSubmit` | No modo register: valida campos, chama `registerStore` e depois `login`. No modo login: chama apenas `login`. Salva sessão e redireciona. |
| Clicar em "Criar minha loja" / "Entrar" | `switchMode` | Alterna entre os modos login e register, limpando erros. |

## Módulos utilizados

- `@/modules/auth` — `authService` para `login`, `registerStore`.
- `next/navigation` — `useRouter` para redirecionar apos login bem-sucedido.

## Observações

- A funcao `suggestSlugFromName` remove acentos via `normalize('NFD')`, converte para minusculas e substitui caracteres especiais por hifens.
- A funcao `saveSession` salva `admin_token`, `admin_store_slug`, `admin_store_name` e `admin_email_verified` no localStorage. Os campos `role` e `isSuperAdmin` sao lidos diretamente do payload JWT pelo hook `useAdminAuth`, nao pelo localStorage.
- No modo register, a senha exige minimo de 8 caracteres (atributo `minLength` no input).
- Erros de 409 (e-mail ou slug duplicado) sao tratados com mensagem amigavel.
- A pagina nao usa `useAdminAuth` — e a unica pagina admin acessivel sem token.
