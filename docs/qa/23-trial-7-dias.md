# QA — Trial de 7 Dias

**Commits relacionados:** `4a81ec4`
**Data:** 2026-06-12

## Descrição

Lojas novas têm um trial de 7 dias contado a partir de `Store.createdAt`. Durante o trial, o catálogo público funciona sem assinatura. Após o trial, a loja precisa de assinatura ativa. Signup não cria assinatura (trial é implícito).

## Casos de Teste

### CT-01: Loja recém-criada (dentro do trial)
1. Criar nova loja
2. Acessar catálogo público
3. **Esperado:** Funciona normalmente. `trialStatus` retorna status ativo.

### CT-02: Trial no 6º dia
1. Loja criada há 6 dias
2. **Esperado:** Trial ainda ativo. Catálogo funciona.

### CT-03: Trial no 8º dia (expirado)
1. Loja criada há 8 dias, sem assinatura
2. Acessar catálogo público
3. **Esperado:** 503 — loja indisponível.

### CT-04: Trial expirado com assinatura ativa
1. Loja com trial expirado MAS assinatura ACTIVE
2. **Esperado:** Catálogo funciona (assinatura ativa = disponível).

### CT-05: Contagem do trial
1. Verificar `TRIAL_DIAS` = 7 e `TRIAL_MS`
2. **Esperado:** Contagem precisa em milissegundos a partir de `createdAt`.

### CT-06: Admin acessível durante e após trial
1. Trial expirado, sem assinatura
2. Acessar `/admin`
3. **Esperado:** Admin funciona. Dono pode assinar plano.

## Função (billing/trial.ts)

| Constante/Função | Descrição |
|-------------------|-----------|
| `TRIAL_DIAS` | 7 |
| `TRIAL_MS` | 7 * 24 * 60 * 60 * 1000 |
| `trialStatus(store)` | Retorna status do trial (ativo/expirado/dias restantes) |

## Critérios de Aceite

- [ ] Trial de 7 dias funciona corretamente
- [ ] Catálogo bloqueado após trial sem assinatura
- [ ] Assinatura ativa supera trial expirado
- [ ] Admin sempre acessível
- [ ] Signup não cria assinatura
