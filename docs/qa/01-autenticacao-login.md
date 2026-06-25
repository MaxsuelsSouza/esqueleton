# QA — Autenticação e Login

**Commits relacionados:** `6f4384e`, `4550155`, `5cc20e2`, `a6da62e`
**Datas:** 2026-06-11 a 2026-06-13

## Descrição

Sistema de autenticação via JWT. O login retorna token, role, emailVerified e dados da loja. O registro tem dois modos: signup público (cria loja + perfil + primeiro usuário OWNER) e convite (com JWT, cria STAFF na loja do token).

## Pré-condições

- API rodando em `localhost:3001`
- Banco de dados com migrations aplicadas
- Pelo menos uma loja cadastrada para testes de login

## Casos de Teste

### CT-01: Login com credenciais válidas
1. Acessar `/admin/login`
2. Preencher e-mail e senha válidos
3. Clicar em "Entrar"
4. **Esperado:** Redireciona para `/admin/produtos`. Token salvo em `localStorage` (`admin_token`). `admin_store_slug`, `admin_store_name`, `admin_role` e `admin_email_verified` também salvos.

### CT-02: Login com credenciais inválidas
1. Acessar `/admin/login`
2. Preencher e-mail válido e senha errada
3. Clicar em "Entrar"
4. **Esperado:** Mensagem de erro exibida. Nenhum token salvo. Log de warn no servidor com e-mail e IP.

### CT-03: Login com e-mail inexistente
1. Acessar `/admin/login`
2. Preencher e-mail que não existe no banco
3. **Esperado:** Mesma mensagem de erro genérica (não revelar se o e-mail existe).

### CT-04: Signup público — Criar minha loja
1. Acessar `/admin/login`
2. Clicar em "Criar minha loja"
3. Preencher: nome da loja, slug (auto-sugerido), e-mail, senha
4. **Esperado:** Loja + StoreProfile + User(OWNER) criados. Redireciona para o admin. Slug validado (lowercase, números, hífens, 3-40 chars).

### CT-05: Signup com slug reservado
1. Tentar criar loja com slug: `admin`, `api`, `loja`, `www`
2. **Esperado:** Erro de validação — slug reservado.

### CT-06: Signup com slug duplicado
1. Tentar criar loja com slug já existente
2. **Esperado:** Erro — slug já em uso.

### CT-07: Registro de staff (convite)
1. Estar logado como OWNER
2. `POST /api/auth/register` com JWT no header e dados do novo usuário
3. **Esperado:** Novo usuário criado como STAFF na mesma loja. Apenas OWNER pode convidar (403 para STAFF).

### CT-08: Token JWT expirado
1. Usar um token com mais de 24h
2. Fazer qualquer requisição autenticada
3. **Esperado:** 401 Unauthorized.

### CT-09: Token sem storeId ou role
1. Gerar token inválido (sem storeId ou role no payload)
2. **Esperado:** Rejeitado por `app.authenticate`.

### CT-10: Rate limit de login
1. Fazer 11 tentativas de login em menos de 1 minuto
2. **Esperado:** Bloqueado após 10 tentativas (429 Too Many Requests).

### CT-11: Rate limit por e-mail (brute force)
1. Tentar 11 logins com o mesmo e-mail em 15 minutos (de IPs diferentes)
2. **Esperado:** Bloqueado após 10 tentativas por e-mail.

## Dados de Teste

```json
{
  "email": "teste@exemplo.com",
  "password": "Senha123!",
  "storeName": "Loja de Teste",
  "storeSlug": "loja-teste"
}
```

## Validações de API

| Endpoint | Método | Rate Limit | Auth |
|----------|--------|------------|------|
| `/api/auth/login` | POST | 10/min | Não |
| `/api/auth/register` | POST | 5/min | Opcional (signup vs convite) |

## Critérios de Aceite

- [ ] Login funciona com credenciais válidas
- [ ] Erros não revelam se o e-mail existe
- [ ] Token JWT contém sub, email, storeId, role, emailVerified
- [ ] Rate limiting funciona (por IP e por e-mail)
- [ ] STAFF não consegue convidar novos usuários
- [ ] Slugs reservados são bloqueados
