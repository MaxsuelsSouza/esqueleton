# Plano de resposta a incidentes de segurança (LGPD, art. 48)

> Fases 5.1 e 5.2 do plano de implementação (`LGPDPLANOIMPLEMENTACAO.md`).
> Este documento deve ser revisado a cada 6 meses e testado em simulação anual (tabletop).

## Responsáveis

| Papel | Quem | Responsabilidade |
|---|---|---|
| Encarregado (DPO) | _a nomear — Fase 0.1_ (`privacidade@esqueleton.com.br`) | Coordena a resposta, comunica ANPD e titulares |
| Técnico | Desenvolvedor responsável pela plataforma | Detecção, contenção, análise forense |

## O que é um incidente comunicável

Acesso não autorizado, vazamento, perda ou destruição de **dados pessoais** que possa
acarretar **risco ou dano relevante** aos titulares (art. 48). Exemplos neste sistema:

- Vazamento do banco (e-mails e hashes de senha de lojistas; nomes e telefones de clientes finais)
- Token JWT ou `JWT_SECRET` comprometidos
- Falha de isolamento entre lojas (dados de uma loja expostos a outra)
- Comprometimento de suboperador (Vercel, Postgres, Upstash, Resend, R2, MercadoPago)

## Fluxo de resposta

### 1. Detecção (imediato)

Sinais que alimentam a detecção (Fase 5.3 — usa o `AuditLog` da Fase 4.1):

- Picos de `LOGIN_FALHOU` no AuditLog (ataque de adivinhação de senha)
- Picos de respostas 401/403/429 nos logs da API
- Ações de super-admin fora do esperado (`PLATAFORMA_LOJA_ALTERADA`)
- Falhas repetidas de validação HMAC no webhook do MercadoPago
- Aviso de segurança de qualquer suboperador

### 2. Contenção (primeiras horas)

- Rotacionar segredos comprometidos: `JWT_SECRET` (invalida todos os tokens),
  credenciais R2, `MERCADOPAGO_WEBHOOK_SECRET`, `RESEND_API_KEY`, `REDIS_URL`
- Revogar sessões dos usuários afetados (marca de revogação — Fase 4.4)
- Suspender lojas/contas comprometidas (`Store.status = SUSPENDED`)
- Preservar evidências: exportar `AuditLog` e logs da Vercel do período

### 3. Avaliação de risco (até 24h)

Registrar por escrito: o que vazou, de quantos titulares, por quanto tempo,
se havia dados de acesso (senhas), probabilidade de dano. Decidir com o DPO se o
incidente é comunicável à ANPD (risco relevante) ou apenas registrado internamente.

### 4. Comunicação (até 3 dias úteis — Resolução CD/ANPD nº 15/2024)

- **ANPD**: pelo formulário oficial no site da ANPD (template abaixo)
- **Lojistas afetados**: e-mail (template abaixo) — a plataforma é operadora dos
  dados dos clientes finais, então o lojista (controlador) precisa saber para
  cumprir as obrigações dele
- **Clientes finais**: texto pronto fornecido às lojas afetadas (template abaixo)

### 5. Pós-incidente (até 2 semanas)

Post-mortem escrito: causa raiz, linha do tempo, o que falhou na detecção,
correções aplicadas, atualização deste plano e do Registro de Operações.

---

## Templates prontos (Fase 5.2)

### Template A — Comunicação à ANPD

```
Natureza dos dados: [ex: nome, e-mail, hash de senha (bcrypt) de lojistas;
  nome e telefone de clientes finais]
Titulares afetados: [número estimado e categorias: lojistas / clientes finais]
Medidas técnicas antes do incidente: senhas com bcrypt, JWT com expiração de 1 dia
  e revogação de sessão, isolamento multi-tenant em nível de código, rate limiting,
  log de auditoria, criptografia em trânsito (TLS)
Riscos aos titulares: [avaliação da etapa 3]
Cronologia: [detecção → contenção → comunicação]
Medidas de contenção: [rotação de segredos, revogação de sessões, ...]
Contato do Encarregado: privacidade@esqueleton.com.br
```

### Template B — E-mail aos lojistas afetados

```
Assunto: [Ação necessária] Incidente de segurança na plataforma

Olá, {nome da loja}.

Identificamos em {data} um incidente de segurança que afetou {descrição do dado}.
O que aconteceu: {resumo em linguagem simples}.
O que já fizemos: {contenção}.
O que você precisa fazer: {ex: trocar a senha ao entrar no painel}.

Se dados dos SEUS clientes foram afetados ({quais}), você, como controlador
desses dados, deve avaliar a comunicação a eles — preparamos um texto pronto
que você pode enviar (em anexo).

Dúvidas: privacidade@esqueleton.com.br
```

### Template C — Texto para os clientes finais (enviado pela loja)

```
Olá! Aqui é a {nome da loja}. O sistema que usamos no nosso catálogo online
teve um incidente de segurança em {data} que pode ter exposto {nome e telefone}
informados em pedidos. Nenhum dado de pagamento foi afetado — pagamentos não
passam pelo catálogo. Recomendamos desconfiar de mensagens pedindo dados ou
pagamentos em nosso nome. Dúvidas? Fale conosco neste mesmo WhatsApp.
```

---

## Simulação anual (Fase 5.4)

Uma vez por ano, rodar um exercício de mesa: sortear um dos cenários da seção
"O que é um incidente comunicável" e percorrer o fluxo completo com DPO + técnico,
cronometrando cada etapa. Registrar as lições no post-mortem do exercício.
