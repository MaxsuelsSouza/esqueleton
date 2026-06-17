# shared/email/ — Envio de e-mail via Resend

Integração com a API do [Resend](https://resend.com) para envio de e-mails transacionais.

## Arquivos

### `resend.plugin.ts`

Plugin Fastify que registra o decorator `app.email`.

**Com `RESEND_API_KEY` definida:** envia e-mails de verdade via Resend.
**Sem `RESEND_API_KEY` (dev):** modo no-op — loga o envio no console sem mandar nada.

```typescript
// Uso em qualquer rota
await app.email.send('usuario@email.com', 'Assunto', '<p>HTML do e-mail</p>')
```

**Interface:**

```typescript
type EmailService = {
  send: (to: string, subject: string, html: string) => Promise<void>
}
```

**Remetente:** usa `FROM_EMAIL` do `.env` (padrão `noreply@esqueleton.com`).

**Tratamento de erro:** loga detalhes do erro com `app.log.error` e lança `'Falha ao enviar e-mail'`.

### `templates.ts`

Funções puras que geram HTML de e-mail. Sem dependências externas.

| Função | Quando é usada | Validade |
|--------|---------------|----------|
| `passwordResetEmail(resetUrl, storeName)` | Esqueci minha senha | 1 hora |
| `emailVerificationEmail(verifyUrl, storeName)` | Cadastro de novo usuário | 7 dias |

**Estilo:** inline CSS, largura máxima 480px, botão escuro (#111827), rodapé cinza.

## Fluxo

```
Rota de forgot-password / registro
  → gera token (crypto.randomBytes)
  → monta URL com token
  → chama passwordResetEmail(url, storeName) ou emailVerificationEmail(url, storeName)
  → chama app.email.send(to, subject, html)
  → Resend envia (ou loga em dev)
```

## Variáveis de ambiente

- `RESEND_API_KEY` — chave da API do Resend (opcional, sem ela e-mails são apenas logados)
- `FROM_EMAIL` — endereço do remetente (opcional, padrão `noreply@esqueleton.com`)
- `FRONTEND_URL` — base da URL nos links dos e-mails (ex: `https://app.esqueleton.com`)
