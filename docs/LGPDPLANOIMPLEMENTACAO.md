# Plano de implementação da LGPD (Lei nº 13.709/2018)

> Plano completo para adequar a plataforma (SaaS multi-tenant de catálogos) à Lei Geral de
> Proteção de Dados. Baseado em análise do código real: schema do banco, rotas da API,
> telas do web, armazenamento no navegador, Redis de sessão e integrações externas.
>
> Data da análise: 2026-07-01. Este documento é o plano — nenhuma mudança de código foi feita.

---

## 1. Como a LGPD se aplica a este sistema (resumo prático da lei)

A LGPD regula qualquer **tratamento de dados pessoais** (coleta, armazenamento, uso,
compartilhamento, eliminação) feito no Brasil ou sobre pessoas no Brasil. Os pontos que
importam para este sistema:

| Conceito | Artigo | O que significa aqui |
|---|---|---|
| **Dado pessoal** | art. 5º, I | Qualquer informação que identifique alguém: nome, e-mail, telefone, endereço, IP. O sistema coleta todos esses. |
| **Bases legais** | art. 7º | Todo tratamento precisa de uma justificativa legal: execução de contrato, consentimento, legítimo interesse, obrigação legal etc. |
| **Controlador × Operador** | art. 5º, VI e VII | Controlador decide o que fazer com o dado; operador trata em nome do controlador. **Este sistema exerce os dois papéis ao mesmo tempo** (ver §2). |
| **Direitos do titular** | art. 18 | Confirmação, acesso, correção, anonimização, portabilidade, **eliminação**, informação sobre compartilhamento e revogação de consentimento. Precisam de canais e ferramentas. |
| **Término do tratamento** | arts. 15-16 | Dados devem ser eliminados quando a finalidade acaba (ex.: conta encerrada), salvo guarda legal. |
| **Encarregado (DPO)** | art. 41 | Pessoa nomeada e divulgada publicamente como canal entre titulares, empresa e ANPD. |
| **Registro das operações** | art. 37 | Manter inventário documentado de todos os tratamentos (RoT). |
| **Segurança** | arts. 46-49 | Medidas técnicas e administrativas aptas a proteger os dados. |
| **Incidentes** | art. 48 | Vazamentos com risco relevante devem ser comunicados à ANPD e aos titulares em prazo razoável (regulamento ANPD: 3 dias úteis). |
| **Transferência internacional** | arts. 33-36 | Dados enviados a servidores fora do Brasil (Vercel, Resend, Cloudflare, Upstash) exigem salvaguardas: cláusulas contratuais, países adequados etc. |
| **Crianças e adolescentes** | art. 14 | Tratamento exige consentimento dos pais. O sistema não coleta idade — mitigar via termos (uso por maiores de 18) e minimização. |
| **Sanções** | art. 52 | Advertência, multa de até 2% do faturamento (máx. R$ 50 mi por infração), bloqueio e eliminação dos dados. |

---

## 2. Papéis: quem é controlador de quê

Este é o ponto estrutural mais importante do plano, porque o sistema é multi-tenant:

```
┌─────────────────────────────────────────────────────────────────┐
│ PLATAFORMA (Esqueleton)                                         │
│                                                                 │
│  CONTROLADORA dos dados dos LOJISTAS                            │
│  (e-mail, senha, nome, dados de assinatura/cobrança)            │
│                                                                 │
│  OPERADORA dos dados dos CLIENTES FINAIS                        │
│  (nome, telefone, pedidos — coletados em nome de cada loja)     │
└─────────────────────────────────────────────────────────────────┘
          ▲                                    ▲
          │ contrato SaaS + DPA                │ política de privacidade
          │                                    │ da loja (controladora)
   ┌──────┴──────┐                      ┌──────┴──────┐
   │   LOJISTA   │  ── controlador ──►  │   CLIENTE   │
   │  (tenant)   │      dos clientes    │    FINAL    │
   └─────────────┘                      └─────────────┘
```

Consequências práticas:

1. **Para dados de lojistas** (modelo `User`, `Subscription`, tokens): a plataforma decide
   tudo — precisa de política de privacidade própria, base legal, atendimento ao art. 18.
2. **Para dados de clientes finais** (`Customer`, `Order.customerName/Phone`,
   `Notification.metadata`, sessões Redis): a plataforma é **operadora**; o lojista é o
   controlador. Isso exige:
   - Cláusula de tratamento de dados (DPA) nos **Termos de Uso** entre plataforma e lojista,
     definindo instruções, sub-operadores, segurança e o que acontece no encerramento.
   - Ferramentas no painel para o lojista **cumprir o art. 18 com os clientes dele**
     (buscar, corrigir, exportar e excluir cliente) — hoje inexistentes.
   - A plataforma só age sobre dados de clientes finais por instrução do lojista
     (exceção: obrigação legal ou ordem da ANPD).
3. **Sub-operadores da cadeia** (ver §5): Vercel, Neon/RDS (Postgres), Upstash (Redis),
   Resend (e-mail), Cloudflare R2 (imagens), Stripe (pagamentos).

---

## 3. Inventário de dados pessoais (Registro de Operações — art. 37)

Mapeamento do que o sistema **realmente** armazena hoje, com a base legal proposta e a
retenção que o plano vai implementar.

### 3.1 Dados de LOJISTAS (plataforma = controladora)

| Dado | Onde | Finalidade | Base legal proposta | Retenção proposta |
|---|---|---|---|---|
| E-mail, senha (bcrypt), nome, papel | `User` (`schema.prisma:40-63`) | Autenticação e gestão da equipe | Execução de contrato (art. 7º, V) | Enquanto a conta existir + 30 dias após exclusão |
| Flags `emailVerified`, `mustChangePassword`, `isSuperAdmin` | `User` | Segurança da conta | Execução de contrato | Idem |
| Tokens de reset de senha / verificação de e-mail | `PasswordResetToken`, `EmailVerificationToken` | Fluxos de segurança | Execução de contrato | **Eliminar após uso ou expiração** (hoje ficam para sempre — só os de reset anteriores são apagados a cada novo pedido) |
| WhatsApp, Instagram, endereço da loja, logo | `StoreProfile:233-247` | Exibição no catálogo público | Execução de contrato | Enquanto a conta existir |
| Dados de assinatura, IDs Stripe | `Subscription`, `Plan.stripePriceId` | Cobrança | Execução de contrato + obrigação legal (fiscal) | 5 anos após término (prazo fiscal) |
| E-mail + IP em logs de login falho | `auth.routes` → `app.log.warn` | Segurança / antifraude | Legítimo interesse (art. 7º, IX) | Máx. 6 meses (política de logs) |
| IP para rate limiting | memória/Redis (`@fastify/rate-limit`) | Segurança | Legítimo interesse | Minutos (janela do limite) — já adequado |
| Dados de cartão | **Não armazenados** — ficam no Stripe | Cobrança | — | — |

### 3.2 Dados de CLIENTES FINAIS (plataforma = operadora; lojista = controlador)

| Dado | Onde | Finalidade | Base legal (do lojista) | Retenção proposta |
|---|---|---|---|---|
| Nome + telefone | `Customer:277-290` (upsert público em `customer.routes.ts:14`) | Identificação do pedido no WhatsApp | Execução de contrato / procedimentos preliminares (art. 7º, V) | Configurável pelo lojista; padrão 2 anos sem novo pedido → anonimizar |
| Nome + telefone no pedido | `Order.customerName/customerPhone:254-255` | Histórico de vendas | Execução de contrato | Manter o pedido; **anonimizar** nome/telefone após prazo (ex.: 2 anos) mantendo valores para estatística |
| Nome + telefone duplicados em JSON | `Notification.metadata:333` (tipo NEW_ORDER) | Exibir card de notificação | Execução de contrato | **90 dias** — notificação é efêmera; hoje fica para sempre |
| Sacola e favoritos por visitante | Redis `cart:{storeId}:{token}` / `fav:...` (`session-store.ts`) | Conveniência de navegação | Legítimo interesse | TTL de 30 dias **já implementado** ✓ |
| Token de sessão do visitante | `localStorage.visitor_session` (UUID gerado no navegador) | Chave da sacola/favoritos | Legítimo interesse | Não expira hoje — ok por ser aleatório e sem vínculo identificado |
| Nome + telefone no navegador | `localStorage['cliente:{slug}']` (`customer-context.tsx`) | Não pedir identificação de novo | Execução de contrato | Já removível pelo botão "Sair" ✓ — documentar no aviso de privacidade |
| Eventos de analytics | `ProductEvent:293-316` | Métricas do lojista | Legítimo interesse | **Sem identificador de pessoa** (não grava IP nem session token) → dado efetivamente anônimo ✓. Reter 12 meses e agregar |
| Produtos vistos | `localStorage.esqueleton_produtos_vistos` | Não duplicar contagem de views | Legítimo interesse | Local, nunca sai do navegador — só documentar |

### 3.3 Compartilhamentos e transferências internacionais

| Destinatário | Dados | Papel | País | Salvaguarda necessária |
|---|---|---|---|---|
| Vercel (hosting web+API) | Todo o tráfego, logs com IP | Sub-operador | EUA | DPA da Vercel + cláusulas-padrão (art. 33) |
| Postgres gerenciado | Banco inteiro | Sub-operador | depende do provedor | DPA + região preferencialmente `sa-east-1` (São Paulo) |
| Upstash (Redis) | Sacolas, favoritos, contadores de rate limit | Sub-operador | configurável | Escolher região Brasil/us-east + DPA |
| Resend (e-mail) | E-mail do lojista, links de reset/verificação | Sub-operador | EUA | DPA do Resend |
| Cloudflare R2 | Imagens (produtos, logos) — baixo teor pessoal | Sub-operador | global | DPA da Cloudflare |
| Stripe | Dados de pagamento do lojista | **Controlador próprio** (instituição de pagamento) | Brasil | Contrato de adesão já cobre; citar na política |
| WhatsApp/Meta | Mensagem do pedido (nome, telefone, itens) | Escolha do cliente final (ele abre o wa.me) | — | Informar na política que o pedido é enviado via WhatsApp |

---

## 4. Diagnóstico: o que falta hoje (gap analysis)

### Não existe nada de:
- ❌ **Política de Privacidade** e **Termos de Uso** (nenhuma página, nenhum link — verificado em `apps/web/src/app/**`)
- ❌ **Aceite de termos no cadastro** (`/admin/login` modo "Criar minha loja" não tem checkbox nem link)
- ❌ **Aviso de privacidade na coleta do cliente final** (modal nome/telefone da sacola e do "Comprar agora" não informa nada — `sacola/page.tsx`, `produto/[id]`)
- ❌ **Encarregado (DPO)** nomeado/divulgado
- ❌ **Ferramentas do art. 18**: nenhum endpoint para excluir/exportar/corrigir `Customer`; a rota admin de clientes é só `GET /api/customers` (`customer.routes.ts:30-39`)
- ❌ **Exclusão de conta do lojista**: não existe rota nem tela (nem para o OWNER, nem no super-admin — que só suspende)
- ❌ **Política de retenção**: pedidos, clientes, notificações, tokens usados e eventos ficam para sempre
- ❌ **Plano de resposta a incidentes** (art. 48)
- ❌ **Registro de operações** (este documento inicia o inventário, mas precisa virar processo)
- ❌ **DPAs formalizados** com sub-operadores

### Já existe e ajuda (aproveitar):
- ✓ Senhas com bcrypt; JWT com expiração de 1 dia; `JWT_SECRET` obrigatório em produção
- ✓ Isolamento multi-tenant com tenant guard (vazamento entre lojas é bloqueado em nível de código)
- ✓ `onDelete: Cascade` de `Store` para **todos** os modelos → apagar a loja já apaga todos os dados dela (fundação pronta para "excluir conta")
- ✓ Sacola/favoritos com TTL de 30 dias no Redis
- ✓ Analytics sem identificador pessoal (`ProductEvent` não grava IP/sessão)
- ✓ Rate limiting, assinatura verificada no webhook, erros 5xx mascarados, keys R2 segregadas por tenant
- ✓ Minimização razoável: cliente final só informa nome + telefone; pagamento fica no Stripe

### Riscos agravados por bugs já conhecidos (ver `RELATORIO-VARREDURA-BUGS.md`):
- ⚠️ **Item 5 (campos não limpam):** o direito de **retificação/eliminação** (art. 18, III)
  fica materialmente quebrado — o lojista "apaga" o WhatsApp/endereço do perfil e o dado volta.
  A correção desse bug passa a ser requisito LGPD, não só qualidade.
- ⚠️ **Item 9 (401 não tratado):** sessões expiradas mascaradas dificultam perceber acessos indevidos.
- ⚠️ Telefone do cliente validado de forma frouxa na sacola (item 23) → dados incorretos
  persistidos em nome de terceiros.

---

## 5. Plano de implementação

Organizado em 6 fases. Cada tarefa tem esforço estimado: **P** (≤ ½ dia), **M** (1-2 dias),
**G** (3-5 dias). Fases 1-3 são o núcleo mínimo de conformidade; 4-6 completam o programa.

### Fase 0 — Governança e documentos (sem código) — pré-requisito de tudo

| # | Tarefa | Esforço |
|---|---|---|
| 0.1 | Nomear o **Encarregado (DPO)** e criar e-mail dedicado (ex.: `privacidade@…`) | P |
| 0.2 | Redigir **Política de Privacidade da plataforma** (dados de lojistas + papel de operadora), usando o inventário do §3 | M |
| 0.3 | Redigir **Termos de Uso** com capítulo de tratamento de dados (DPA plataforma↔lojista): instruções, sub-operadores autorizados, segurança, auxílio ao art. 18, devolução/eliminação no encerramento | M |
| 0.4 | Redigir **modelo de aviso de privacidade da loja** (texto curto exibido ao cliente final na identificação) | P |
| 0.5 | Formalizar este inventário como **Registro de Operações (RoT)** vivo, com dono e revisão semestral | P |
| 0.6 | Levantar e arquivar os **DPAs dos sub-operadores** (Vercel, Resend, Cloudflare, Upstash, provedor Postgres, Stripe) e registrar as bases de transferência internacional | M |

### Fase 1 — Transparência nas telas (web)

| # | Tarefa | Onde mexer | Esforço |
|---|---|---|---|
| 1.1 | Páginas públicas `/privacidade` e `/termos` (conteúdo da Fase 0), linkadas no rodapé da home e do catálogo | `apps/web/src/app/privacidade/`, `termos/`, rodapé em `loja/[slug]/layout` e `app/page.tsx` | M |
| 1.2 | **Checkbox de aceite** no cadastro da loja ("Li e aceito os Termos e a Política de Privacidade"), bloqueando o submit sem aceite e **gravando data/versão do aceite** | `admin/login/page.tsx` + `page.hooks.ts`; API: campos `acceptedTermsAt`, `acceptedTermsVersion` no `User` (migração) e validação no `POST /api/auth/register` | M |
| 1.3 | **Aviso de privacidade no modal de identificação** do cliente final (sacola e "Comprar agora"): frase curta "Seu nome e telefone serão usados pela loja {nome} apenas para atender seu pedido" + link para a política | `sacola/page.tsx`, `produto/[id]/ProductDetailClient.tsx` | P |
| 1.4 | Documentar na política o uso de `localStorage` (token de sessão, identificação do cliente, produtos vistos). Não há cookies de rastreamento → **não é necessário banner de cookies**; manter assim (se um dia entrar analytics de terceiros, revisitar) | política (Fase 0) | P |
| 1.5 | Informar no fluxo do WhatsApp que a mensagem contém os dados do pedido e é entregue via Meta/WhatsApp | texto do modal (1.3) | P |

### Fase 2 — Direitos dos titulares (art. 18): ferramentas de verdade

**Para o cliente final (lojista atende; plataforma fornece a ferramenta):**

| # | Tarefa | Onde mexer | Esforço |
|---|---|---|---|
| 2.1 | Nova tela **`/admin/clientes`**: listar, buscar por telefone/nome, **editar** e **excluir** cliente | nova rota web + `DELETE /api/customers/:id` e `PUT /api/customers/:id` (ownership pattern `deleteMany({ id, storeId })`) | M |
| 2.2 | Ao excluir cliente, opção "**anonimizar pedidos**": `UPDATE Order SET customerName = NULL, customerPhone = NULL WHERE storeId = ? AND customerPhone = ?` + limpar `Notification.metadata` correspondente (pedido e valores permanecem para estatística — art. 12: dado anonimizado deixa de ser pessoal) | `order`/`notification` services | M |
| 2.3 | **Exportar dados de um cliente** (portabilidade): JSON/CSV com cadastro + pedidos daquele telefone | `GET /api/customers/:id/export` + botão na tela 2.1 | M |
| 2.4 | Botão "excluir meus dados" público **não é necessário** (o titular aciona a loja, controladora), mas a política deve indicar o canal (WhatsApp da loja + e-mail do DPO como escalonamento) | política | P |

**Para o lojista (plataforma atende):**

| # | Tarefa | Onde mexer | Esforço |
|---|---|---|---|
| 2.5 | **Exportar dados da conta/loja** (portabilidade): dump JSON de perfil, usuários (sem hash de senha), produtos, pedidos, clientes, cupons etc. | `GET /api/store/export` (OWNER only) + botão em `/admin/perfil` | M |
| 2.6 | **Excluir a conta/loja**: rota `DELETE /api/store` (OWNER, confirmação por senha + assinatura não-ativa), executando `prisma.store.delete` (cascade já apaga tudo) + `deleteByPrefix` no R2 (`{storeId}/`) + varredura das chaves Redis da loja + cancelamento Stripe | nova rota + tela em `/admin/perfil`; reaproveitar `buildR2Prefix` | G |
| 2.7 | Membro STAFF removido (`DELETE /api/users/:id`) já existe ✓ — complementar apagando os tokens de reset/verificação dele (cascade de `User` já cobre ✓) e registrando o evento em log de auditoria (Fase 4) | — | P |
| 2.8 | Corrigir o bug **"campos não limpam"** (relatório, item 5) — sem isso, retificação/eliminação parcial não funciona | schemas da API + hooks do front | M |
| 2.9 | Processo documentado de atendimento ao art. 18 com prazo (15 dias, art. 19 §2º): quem recebe (DPO), como valida identidade, como executa | documento + planilha/issue tracker | P |

### Fase 3 — Retenção e eliminação (arts. 15-16)

| # | Tarefa | Onde mexer | Esforço |
|---|---|---|---|
| 3.1 | **Job de limpeza** (cron Vercel ou script `scripts/`): apagar `PasswordResetToken`/`EmailVerificationToken` usados ou expirados há > 24h | novo script + cron | P |
| 3.2 | Job: apagar `Notification` com mais de 90 dias (remove o nome/telefone duplicado no `metadata`) | idem | P |
| 3.3 | Job: **anonimizar** `Order.customerName/customerPhone` de pedidos com mais de N meses (N configurável; padrão 24) e apagar `Customer` sem pedido novo no mesmo período | idem | M |
| 3.4 | Job: agregar/expurgar `ProductEvent` com mais de 12 meses (tabela cresce sem limite hoje) | idem | M |
| 3.5 | Loja **SUSPENDED/cancelada** há mais de X meses (padrão 6): notificar OWNER por e-mail e, sem reativação em 30 dias, executar a exclusão da Fase 2.6 | job + e-mail via Resend | M |
| 3.6 | Política de **logs**: configurar retenção de 6 meses nos logs da Vercel/API e garantir que nenhum log grave senha/token (revisar `app.log` atuais) | config + revisão | P |
| 3.7 | Documentar retenção de **backups** do Postgres (ex.: 35 dias) e o fato de que dados excluídos persistem em backup até expirar — incluir na política | documento | P |

### Fase 4 — Segurança (arts. 46-49) — reforços sobre a base existente

| # | Tarefa | Esforço |
|---|---|---|
| 4.1 | **Log de auditoria** mínimo (nova tabela `AuditLog`: quem, o quê, quando, IP) para ações sensíveis: login, troca de senha, convite/remoção de usuário, exportação, exclusões, ações de super-admin | G |
| 4.2 | Tratar **401 globalmente** no web (redirecionar para login) — hoje sessão expirada vira erro genérico (relatório, item 9) | M |
| 4.3 | Avaliar migração do JWT de `localStorage` para **cookie httpOnly** (risco XSS documentado no CLAUDE.md como aceito — a LGPD pede reavaliação formal dessa aceitação; se mantido, registrar a justificativa no RoT) | G (se migrar) / P (se documentar) |
| 4.4 | **Revogação de sessão**: lista de tokens invalidados (Redis) usada no logout e na troca de senha/remoção de membro | M |
| 4.5 | Política de senha mínima já existe (8 chars) — adicionar checagem contra senhas vazadas (ex.: lista local das 10k mais comuns) | P |
| 4.6 | Revisar permissões: rota pública de upsert de cliente aceita gravação por qualquer IP (rate limit 10/min ✓) — adicionar verificação de formato estrito de telefone para reduzir dados-lixo em nome de terceiros | P |
| 4.7 | Verificar criptografia em repouso do Postgres/R2/Redis nos provedores (checkbox de contratação, sem código) | P |

### Fase 5 — Resposta a incidentes (art. 48)

| # | Tarefa | Esforço |
|---|---|---|
| 5.1 | **Plano de resposta** documentado: detecção → contenção → avaliação de risco → comunicação ANPD (3 dias úteis) e titulares → post-mortem. Definir responsáveis (DPO + dev) | M |
| 5.2 | Templates prontos: comunicação à ANPD (formulário oficial), e-mail aos lojistas afetados, texto para clientes finais (enviado pelas lojas) | P |
| 5.3 | Alertas técnicos que alimentam a detecção: monitorar picos de 401/403/429, falhas de webhook, acessos super-admin (usa o AuditLog da 4.1) | M |
| 5.4 | Simulação anual (tabletop) do plano | P (recorrente) |

### Fase 6 — Programa contínuo

| # | Tarefa | Esforço |
|---|---|---|
| 6.1 | **Privacy by design no processo de dev**: adicionar ao `CLAUDE.md`/PR template a pergunta "esta feature cria/usa dado pessoal? atualizou o RoT? definiu retenção?" | P |
| 6.2 | **RIPD/DPIA** (relatório de impacto, art. 38) — hoje o risco é moderado (sem dados sensíveis); elaborar versão simples e revisitar se surgirem features de marketing/mensageria ativa | M |
| 6.3 | Revisão semestral do inventário (§3), dos DPAs e das retenções | P (recorrente) |
| 6.4 | Se o painel ganhar disparo ativo de mensagens/marketing para `Customer` (WhatsApp em massa, e-mail), **parar e reavaliar**: exigirá consentimento específico + opt-out — hoje nada disso existe e a base de "execução de contrato" não cobre marketing | — |

---

## 6. Mudanças de banco (migrações previstas)

```prisma
// User — registro do aceite dos termos (Fase 1.2)
acceptedTermsAt      DateTime?
acceptedTermsVersion String?

// Novo modelo — auditoria (Fase 4.1)
model AuditLog {
  id        String   @id @default(cuid())
  storeId   String?          // null para ações de plataforma
  userId    String?
  action    String           // LOGIN, PASSWORD_CHANGE, CUSTOMER_DELETE, STORE_EXPORT, ...
  detail    String?
  ip        String?
  createdAt DateTime @default(now())
  @@index([storeId])
  @@index([createdAt])
}

// Store — controle do ciclo de exclusão (Fases 2.6/3.5)
deletionRequestedAt DateTime?
```

Observações:
- `AuditLog` deve entrar no `MODELOS_DE_LOJA` do tenant guard **com exceção documentada**
  para registros de plataforma (`storeId` null), a exemplo de `PasswordResetToken`.
- Retenções configuráveis por loja podem morar em `StoreProfile` (ex.: `customerRetentionMonths Int @default(24)`).

## 7. Sequência recomendada e marcos

1. **Semana 1-2 — Fase 0** completa (documentos destravam tudo; sem eles nenhuma tela tem o que linkar).
2. **Semana 3 — Fase 1** (transparência): baixo esforço, elimina a não-conformidade mais visível.
3. **Semana 4-6 — Fase 2** (direitos): prioridade para 2.1/2.2 (clientes) e 2.6 (excluir loja) + correção do bug de limpeza de campos (2.8).
4. **Semana 7 — Fase 3** (retenção): jobs simples, alto ganho de risco.
5. **Semana 8+ — Fases 4-6** em paralelo com o roadmap normal.

**Critério de "mínimo conforme" (pode se declarar em adequação):** Fases 0-3 concluídas +
plano de incidentes (5.1/5.2) escrito.

## 8. O que este sistema NÃO faz (e deve continuar não fazendo sem revisitar o plano)

- Não coleta **dados sensíveis** (art. 5º, II — saúde, biometria, religião etc.) — manter.
- Não usa cookies/pixels de terceiros nem publicidade — o que dispensa banner de consentimento.
- Não grava IP/identificador de visitante nos eventos de analytics — manter essa anonimização.
- Não armazena dados de cartão — pagamentos ficam integralmente no Stripe.
- Não trata dados de crianças intencionalmente — reforçar nos Termos (maiores de 18 para lojistas).

Qualquer mudança nesses pontos exige atualizar o RoT (§3), a política e possivelmente o RIPD (6.2).
