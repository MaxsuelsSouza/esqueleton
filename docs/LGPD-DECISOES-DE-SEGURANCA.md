# Registro de decisões de segurança (LGPD, Fases 4.3 e 4.7)

> Complementa o Registro de Operações. Revisão semestral junto com o inventário
> do `LGPDPLANOIMPLEMENTACAO.md` (§3).

## 4.3 — JWT em localStorage: risco reavaliado e MANTIDO (com mitigações)

**Decisão (2026-07-03):** o token JWT do painel admin continua no `localStorage`
do navegador em vez de cookie httpOnly.

**Risco:** um XSS no painel poderia ler o token. Cookie httpOnly eliminaria essa
leitura, mas exigiria proteção CSRF, mudanças no CORS (API e web em domínios
diferentes na Vercel) e reescrita do fluxo de autenticação do painel.

**Por que o risco é aceitável hoje:**

1. O painel não renderiza HTML de terceiros (sem `dangerouslySetInnerHTML`,
   sem scripts externos além do bundle próprio) — superfície de XSS mínima;
2. Tokens expiram em 1 dia;
3. **Revogação de sessão no servidor (Fase 4.4):** logout, troca de senha,
   redefinição por e-mail e remoção de membro invalidam tokens imediatamente —
   um token roubado morre junto com a primeira reação da vítima;
4. **Tratamento global de 401 (Fase 4.2):** sessões inválidas são percebidas
   na hora, não mascaradas como erro genérico;
5. **Log de auditoria (Fase 4.1):** logins e ações sensíveis ficam registrados
   com IP — uso anômalo de uma conta é rastreável.

**Gatilhos para reavaliar:** introdução de conteúdo HTML de terceiros no painel,
scripts externos (analytics/chat), ou incidente envolvendo XSS.

## 4.7 — Criptografia em repouso nos provedores (checklist de contratação)

Verificar (e registrar aqui) ao contratar/renovar cada provedor de produção:

| Provedor | O que verificar | Status |
|---|---|---|
| Postgres gerenciado (Neon/RDS/etc.) | Encryption at rest habilitada; região preferencial `sa-east-1` (São Paulo) | _pendente — anotar ao contratar_ |
| Upstash (Redis) | Encryption at rest + TLS; região Brasil ou us-east | _pendente_ |
| Cloudflare R2 | Criptografia em repouso é padrão (verificar na conta) | _pendente_ |
| Vercel | Logs e env vars criptografados em repouso (padrão da plataforma) | _pendente_ |
| Resend | DPA assinado; retenção de logs de e-mail | _pendente_ |

Todos os provedores acima também precisam de **DPA arquivado** (Fase 0.6) com
cláusula de transferência internacional quando fora do Brasil (arts. 33-36).
