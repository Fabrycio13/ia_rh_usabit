# Plano de Implementação — Versão Trial

> **Status:** Planejado | **Branch:** `usanit-people-v_1.3` | **Data:** 30/06/2026

---

## Visão Geral

**Objetivo:** Qualquer pessoa acessa o site, registra com nome + empresa + email + senha, e começa a usar na hora com limites mensais. Trial = org individual (sem invite, sem multi-org).

**Limites da Trial:**

| Recurso | Limite | Reset |
|---------|--------|-------|
| Análises (IA) | 15/mês | Dia 1 |
| Vagas ativas | 3 | — |
| Pool (currículos) | 50 | — |
| ChatWidget IA | ❌ Bloqueado | — |
| Convidar pessoas | ❌ Bloqueado | — |

**Quando atinge o limite:** toast — "Você usou todas as X análises do mês. O limite resetará no dia 1º."

---

## Arquitetura — O que muda

### Nova tabela

```sql
usage_tracker (organization_id, period_month, analyses_used)
```

### Trigger modificado

`handle_new_user` — gera UUID + cria org automaticamente quando `organization_id` não vem no metadata (self-register). Invite flow **intocado** (só admin de org interna convida).

### Função RLS

`get_my_org_id()` — **não muda**.

### Edge Function nova

`send-confirmation-email` — template visual Usabit (logo cid, cores #2C58FD, footer).

### O que NÃO muda

- Multi-org — não existe na trial
- Invite de trial user — bloqueado
- `profiles` — mesma estrutura

---

## Tasks

### T-01: Migration `071_trial_setup.sql` [P0]

**Dependências:** Nenhuma  
**Arquivo:** `supabase/migrations/071_trial_setup.sql`

#### 1. Substituir `handle_new_user`

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_org_id UUID;
    v_org_name TEXT;
    v_role TEXT;
BEGIN
    -- Invite: usa org_id do metadata; Self-register: gera novo
    IF NEW.raw_user_meta_data->>'organization_id' IS NOT NULL 
       AND NEW.raw_user_meta_data->>'organization_id' != '' THEN
        v_org_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
    ELSE
        v_org_id := gen_random_uuid();
    END IF;

    v_org_name := COALESCE(
        NEW.raw_user_meta_data->>'organization_name',
        'Minha Organização'
    );

    v_role := COALESCE(
        NEW.raw_user_meta_data->>'user_role',
        'administrador'
    );

    INSERT INTO organizations (id, name)
    VALUES (v_org_id, v_org_name)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (
        id, email, name,
        user_role, organization_id, organization_name,
        status, account_type, onboarding_completed
    ) VALUES (
        NEW.id, NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        v_role, v_org_id, v_org_name,
        'pending', 'trial', false
    )
    ON CONFLICT (id) DO UPDATE SET
        organization_id = COALESCE(EXCLUDED.organization_id, profiles.organization_id),
        organization_name = COALESCE(EXCLUDED.organization_name, profiles.organization_name),
        user_role = COALESCE(EXCLUDED.user_role, profiles.user_role);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
```

#### 2. Criar `usage_tracker` + RPC

```sql
CREATE TABLE IF NOT EXISTS usage_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    period_month TEXT NOT NULL,
    analyses_used INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, period_month)
);

ALTER TABLE usage_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage: org_read" ON usage_tracker FOR SELECT
    USING (organization_id IS NOT DISTINCT FROM get_my_org_id());

CREATE POLICY "usage: admin_write" ON usage_tracker FOR ALL
    USING (
        get_my_role() IN ('owner', 'administrador')
        AND organization_id IS NOT DISTINCT FROM get_my_org_id()
    )
    WITH CHECK (
        get_my_role() IN ('owner', 'administrador')
        AND organization_id IS NOT DISTINCT FROM get_my_org_id()
    );

CREATE OR REPLACE FUNCTION increment_analysis_usage(p_org_id UUID)
RETURNS INT AS $$
DECLARE
    v_month TEXT := to_char(now(), 'YYYY-MM');
    v_current INT;
    v_limit INT := 15;
BEGIN
    INSERT INTO usage_tracker (organization_id, period_month, analyses_used)
    VALUES (p_org_id, v_month, 1)
    ON CONFLICT (organization_id, period_month) DO UPDATE SET
        analyses_used = usage_tracker.analyses_used + 1,
        updated_at = now()
    RETURNING analyses_used INTO v_current;

    RETURN v_limit - v_current;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
```

#### 3. Corrigir usuários existentes

```sql
DO $$
DECLARE
    r RECORD;
    v_org_id UUID;
BEGIN
    FOR r IN SELECT id FROM profiles WHERE organization_id IS NULL LOOP
        v_org_id := gen_random_uuid();
        INSERT INTO organizations (id, name) VALUES (v_org_id, 'Minha Organização')
            ON CONFLICT DO NOTHING;
        UPDATE profiles SET organization_id = v_org_id WHERE id = r.id;
    END LOOP;
END $$;
```

---

### T-02: Edge Function `send-confirmation-email` [P0]

**Dependências:** Nenhuma  
**Arquivo:** `supabase/functions/send-confirmation-email/index.ts`

**Estrutura:** Mesmo padrão das outras 7 funções de email:
- `LOGO_BASE64` + HTML template (logo cid, borda #2C58FD, footer Usabit)
- `checkRateLimit(ip, 3, 3600)` — 3 envios/IP/hora
- GoTrue Admin API: `POST /auth/v1/admin/generate_link { type: 'signup', email }`
- Botão: "Confirmar Cadastro" → link do GoTrue
- Envio via Resend API (`from: noreply@space.pro.br`)
- Valida se email existe no `auth.users` antes de enviar

---

### T-03: `Register.tsx` — campo empresa + Edge Function [P0]

**Dependências:** T-01, T-02  
**Arquivo:** `src/pages/auth/Register.tsx`

Mudanças:
1. Campo novo: "Nome da Empresa" (obrigatório, min 2 chars)
2. Após `signUp` sucesso: `invoke('send-confirmation-email', { body: { email, name } })`
3. Erro "User already exists" → botão "Reenviar email de confirmação" + "Fazer login"
4. Reenviar: `supabase.auth.resend({ type: 'signup', email })` + Edge Function

---

### T-04: Service `usageTracker.ts` [P1]

**Dependências:** T-01  
**Arquivo:** `src/core/services/usageTracker.ts`

```ts
const LIMITS = { analyses: 15, vagas: 3, pool: 50 };

canDoAnalysis(orgId)    → analyses_used < 15?
useAnalysis(orgId)      → RPC increment_analysis_usage → retorna restantes
canAddToPool(orgId)     → COUNT candidates < 50?
canCreateVaga(orgId)    → COUNT vagas ativas < 3?
getRemaining(orgId)     → 15 - analyses_used
```

---

### T-05: `UserContext.tsx` — trial info [P1]

**Dependências:** T-04  
**Arquivo:** `src/core/contexts/UserContext.tsx`

Adicionar ao `loadProfile()`:
```ts
const { data } = await supabase.from('usage_tracker')
    .select('analyses_used')
    .eq('organization_id', profile.organization_id)
    .eq('period_month', new Date().toISOString().slice(0, 7))
    .maybeSingle();

profile.trialInfo = {
    remainingAnalyses: 15 - (data?.analyses_used ?? 0),
    poolUsed: await countCandidates(profile.organization_id),
    vagasUsed: await countActiveVagas(profile.organization_id),
};
```

---

### T-06: Barra de status no header [P2]

**Dependências:** T-05  
**Arquivo:** `src/layouts/DashboardLayout.tsx`

```tsx
if (profile.account_type === 'trial') {
    <TrialStatusBar remaining={profile.trialInfo.remainingAnalyses} />
}
```

---

### T-07: Bloqueios [P1]

**Dependências:** T-04

| # | Onde | Como |
|---|------|------|
| 7a | PoolAddCandidate | `canDoAnalysis()` + `canAddToPool()` antes de importar |
| 7b | PoolTalentos batch | Cada candidato: checa + `useAnalysis()` após sucesso |
| 7c | handleConfirmAnalyze | Checa antes, `useAnalysis()` depois |
| 7d | ReanalyzeCandidateModal | Checa antes, `useAnalysis()` depois |
| 7e | VagaForm | Se trial: `canCreateVaga()` ao criar |
| 7f | Sidebar ChatWidget | `if (trial) return null` |
| 7g | openai-proxy EF | Buscar `account_type`, se trial → 402 |
| 7h | send-invite-email EF | Se `account_type = 'trial'` → 403 |

---

## Ordem de Execução

```
Dia 1: T-01 + T-02 (independentes, paralelizáveis)
Dia 2: T-03 (Register)
Dia 3: T-04 + T-05 + T-06 (sequencial)
Dia 4: T-07a,b,c,d,e,f,g,h (8 bloqueios)
```

---

## Pontos Cegos

### 🔴 T-01: Trigger quebrar invite flow

**Risco:** Modificar `handle_new_user` quebra convites.
**Solução:** `IF organization_id IS NOT NULL → usa o que veio`. Invite continua usando org_id do admin.
**Teste:** Criar invite pelo AdminDashboard após deploy.

### 🔴 T-02: Edge Function sem rate limit

**Risco:** Spam de envio de email.
**Solução:** `checkRateLimit(ip, 3, 3600)` + validar email existe no auth.users.
**Teste:** 4 chamadas seguidas → 429.

### 🟡 T-03: SignUp falha mas Edge Function roda

**Risco:** Se `signUp` falhar, mas código continuar e chamar EF.
**Solução:** `if (!error && data.user) invoke(...)`.
**Teste:** Email duplicado → EF NÃO chamada.

### 🟡 T-07b: Batch consome análise mesmo se falhar

**Risco:** Match falha no meio, análise já foi consumida.
**Solução:** `useAnalysis()` só dentro do `try` após `Promise.all` bem-sucedido.
**Teste:** Simular erro de IA → contador não incrementa.

### 🟡 T-07f: openai-proxy sem acesso ao account_type

**Risco:** EF autentica mas não sabe se é trial.
**Solução:** Query no profile: `select account_type`. Se trial → 402.
**Teste:** Chamar proxy com token trial → 402.

### 🔴 T-07h: Trial user pode chamar `send-invite-email` direto

**Risco:** Trial user descobre a URL e chama a EF de invite via API, burlando o bloqueio de convidar.
**Solução:** A EF já valida JWT + role. Adicionar verificação de `account_type`:
```ts
if (callerProfile.account_type === 'trial') {
    return error 403; // Trial users cannot invite
}
```
**Teste:** Chamar EF com token de trial user → 403.

---

### 🟡 T-07d: ReanalyzeCandidateModal sem bloqueio

**Risco:** O modal de reanálise (ReanalyzeCandidateModal) chama `analyzeJobApplication` (gpt-4o) sem verificar limite de análises.
**Solução:** Mesmo padrão do T-07c:
```ts
const can = await canDoAnalysis(profile.organization_id);
if (!can) { toast.error('Limite de análises atingido'); return; }
// ... análise ...
await useAnalysis(profile.organization_id);
```
**Teste:** Tentar reanalisar com 0 análises restantes → bloqueado.

---

**Risco:** `DO $$` loop pode demorar se muitos registros.
**Mitigação:** Poucos registros. `ON CONFLICT DO NOTHING` evita duplicatas.

---

## Checklist

- [ ] T-01: Migration roda sem erro no SQL Editor
- [ ] T-01: `SELECT get_my_org_id()` retorna UUID
- [ ] T-01: Novo registro → org criada automaticamente
- [ ] T-02: Edge Function deploy → curl 200
- [ ] T-02: IP > 3 chamadas → 429
- [ ] T-03: Registrar dados válidos → email chega
- [ ] T-03: Email duplicado → mostra "Reenviar"
- [ ] T-03: Clicar "Reenviar" → email chega de novo
- [ ] T-04: `canDoAnalysis` true (0 usadas) e false (15)
- [ ] T-04: `useAnalysis` incrementa corretamente
- [ ] T-07a: Pool cheio → bloqueado
- [ ] T-07a: Sem análises → bloqueado
- [ ] T-07b: Batch para ao zerar
- [ ] T-07d: Reanálise com 0 restantes → bloqueado
- [ ] T-07e: 4ª vaga → bloqueada
- [ ] T-07f: ChatWidget não aparece trial
- [ ] T-07h: Invite EF chamada por trial → 403
