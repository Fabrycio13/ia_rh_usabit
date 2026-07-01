# Plano: Versão Trial (Self-Service)

## Objetivo

Qualquer pessoa acessa o site, cria conta e começa a usar na hora com:
- **Análises:** 15/mês (reseta todo dia 1º)
- **Vagas:** 3 ativas
- **Pool:** 50 currículos máximo
- **Sem:** assistente IA (ChatWidget)
- **Limite atingido:** "Você usou todas as análises do mês. Volte dia 1º."
- **Sem planos pagos** (por enquanto)

## Situação Atual

**Hoje:**
1. Usuário se registra → `owner` com `org_id=NULL`
2. Nenhuma organização é criada
3. Resultado: owner sem org não funciona

**Invite flow:** ✅ funciona, não pode quebrar — `organization_id` vem no metadata do GoTrue

## Mudanças Necessárias

| # | Arquivo | O quê |
|---|---------|-------|
| 1 | Migration: fix trigger | Gera UUID + cria org SÓ se `organization_id` não veio no metadata |
| 2 | Migration: usage_tracker + RPC | Tabela de controle + função de incremento |
| 3 | Migration: policy organizations INSERT | Permitir trigger criar org (SECURITY DEFINER) |
| 4 | `Register.tsx` | Campo "Nome da Empresa" obrigatório |
| 5 | `usageTracker.ts` | Service: `canDoAnalysis`, `incrementAnalysis`, `canAddToPool`, `canCreateVaga` |
| 6 | `UserContext.tsx` | Carregar info de trial no profile |
| 7 | `PoolTalentos.tsx` | Bloquear add se pool cheio ou sem análises |
| 8 | `PoolAddCandidate.tsx` | Bloquear import se sem análises ou pool cheio |
| 9 | `VagaForm.tsx` | Bloquear criar se 3 vagas ativas |
| 10 | `Sidebar/DashboardLayout` | Esconder ChatWidget pra trial |
| 11 | `Edge: openai-proxy` | Bloquear chamada se trial (segurança) |

## 1. Fix do Trigger `handle_new_user` (migration 071)

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_org_id UUID;
    v_org_name TEXT;
    v_role TEXT;
BEGIN
    -- Se veio organization_id do metadata (invite) → usa ele
    -- Se NÃO veio (registro público) → gera um novo
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
        'administrador'  -- self-register = admin, não owner
    );

    -- Criar org se não existe
    INSERT INTO organizations (id, name)
    VALUES (v_org_id, v_org_name)
    ON CONFLICT (id) DO NOTHING;

    -- Criar/atualizar profile
    INSERT INTO public.profiles (
        id, email, name,
        user_role,
        organization_id,
        organization_name,
        status,
        account_type,
        onboarding_completed
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        v_role,
        v_org_id,
        v_org_name,
        'pending',
        'trial',
        false
    )
    ON CONFLICT (id) DO UPDATE SET
        organization_id = COALESCE(EXCLUDED.organization_id, profiles.organization_id),
        organization_name = COALESCE(EXCLUDED.organization_name, profiles.organization_name),
        user_role = COALESCE(EXCLUDED.user_role, profiles.user_role);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
```

**Garantias:**
- ✅ **Invite flow intacto**: se `organization_id` existe no metadata → usa ele
- ✅ **Self-register**: se não existe → gera UUID novo + cria org
- ✅ `ON CONFLICT (id) DO UPDATE` → não quebra se profile já existe (invite upsert)
- ✅ `SECURITY DEFINER` → trigger roda como owner, ignora RLS de organizations

## 2. Tabela `usage_tracker` + RPC (migration 071)

```sql
CREATE TABLE IF NOT EXISTS usage_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    period_month TEXT NOT NULL,  -- '2026-07'
    analyses_used INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, period_month)
);

ALTER TABLE usage_tracker ENABLE ROW LEVEL SECURITY;

-- Membros da org podem ver seu uso
CREATE POLICY "usage: org_read" ON usage_tracker FOR SELECT
    USING (organization_id IS NOT DISTINCT FROM get_my_org_id());

-- Owner/admin podem incrementar
CREATE POLICY "usage: admin_write" ON usage_tracker FOR ALL
    USING (
        get_my_role() IN ('owner', 'administrador')
        AND organization_id IS NOT DISTINCT FROM get_my_org_id()
    )
    WITH CHECK (
        get_my_role() IN ('owner', 'administrador')
        AND organization_id IS NOT DISTINCT FROM get_my_org_id()
    );

-- RPC para incremento atômico
CREATE OR REPLACE FUNCTION increment_analysis_usage(
    p_org_id UUID
) RETURNS INT AS $$
DECLARE
    v_month TEXT := to_char(now(), 'YYYY-MM');
    v_current INT;
    v_limit INT := 15;  -- trial limit
BEGIN
    -- Upsert: se é um novo mês, começa do zero
    INSERT INTO usage_tracker (organization_id, period_month, analyses_used)
    VALUES (p_org_id, v_month, 1)
    ON CONFLICT (organization_id, period_month) DO UPDATE SET
        analyses_used = usage_tracker.analyses_used + 1,
        updated_at = now()
    RETURNING analyses_used INTO v_current;

    RETURN v_limit - v_current;  -- quantas ainda restam
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
```

**Funcionamento do reset mensal:**
- Sem cron job. O reset é "lazy": quando o mês muda, `period_month` muda → o upsert insere nova linha com `analyses_used = 1` (reset automático)

## 3. Service `usageTracker.ts`

```ts
// src/core/services/usageTracker.ts

import { supabase } from './supabase';

const TRIAL_LIMITS = {
    analyses: 15,
    vagas: 3,
    pool: 50,
};

export async function canDoAnalysis(orgId: string): Promise<boolean> {
    // Sempre busca do banco, sem cache
    const { data } = await supabase.from('usage_tracker')
        .select('analyses_used')
        .eq('organization_id', orgId)
        .eq('period_month', new Date().toISOString().slice(0, 7))
        .maybeSingle();

    return (data?.analyses_used ?? 0) < TRIAL_LIMITS.analyses;
}

export async function useAnalysis(orgId: string): Promise<number> {
    // Retorna quantas restam
    const { data } = await supabase.rpc('increment_analysis_usage', {
        p_org_id: orgId,
    });
    return (data as number) ?? 0;
}

export async function canAddToPool(orgId: string): Promise<boolean> {
    const { count } = await supabase.from('candidates')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);
    return (count ?? 0) < TRIAL_LIMITS.pool;
}

export async function canCreateVaga(orgId: string): Promise<boolean> {
    const { count } = await supabase.from('vagas_white_label')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('is_active', true);
    return (count ?? 0) < TRIAL_LIMITS.vagas;
}

export async function getRemaining(orgId: string): Promise<number> {
    const { data } = await supabase.from('usage_tracker')
        .select('analyses_used')
        .eq('organization_id', orgId)
        .eq('period_month', new Date().toISOString().slice(0, 7))
        .maybeSingle();
    return TRIAL_LIMITS.analyses - (data?.analyses_used ?? 0);
}
```

## 4. Pontos de Bloqueio no Frontend

### 4.1 Barra de status (header)
```
🟣 Trial · 8/15 análises restantes este mês
```

Quando zerar:
```
🟣 Trial · 0/15 análises — limite do mês atingido
```

### 4.2 PoolAddCandidate
```tsx
// Antes de começar a importar:
const canImport = await canDoAnalysis(orgId) && await canAddToPool(orgId);
if (!canImport) {
    const msg = ...;  // "Limite de análises atingido" ou "Pool cheio"
    toast.error(msg);
    return;
}
```

### 4.3 Batch Match (PoolTalentos)
```tsx
// Antes do batchMatchToJob:
for (const c of selected) {
    const ok = await canDoAnalysis(orgId);
    if (!ok) {
        toast.error(`Limite de análises atingido. Apenas ${i} processados.`);
        break;
    }
    // ... processa ...
    await useAnalysis(orgId);
}
```

### 4.4 Criar Vaga (VagaForm)
```tsx
// No handler de criar vaga:
if (trial && !(await canCreateVaga(orgId))) {
    toast.error('Limite de 3 vagas ativas atingido.');
    return;
}
```

### 4.5 ChatWidget
```tsx
// Sidebar ou DashboardLayout:
const { profile } = useUser();
if (profile.account_type === 'trial') return null; // não renderiza
```

### 4.6 Edge Function `openai-proxy`
```ts
// No início da função, após autenticar:
const { data: profile } = await supabaseAdmin.from('profiles')
    .select('account_type')
    .eq('id', userId)
    .single();

if (profile?.account_type === 'trial') {
    return new Response(JSON.stringify({ error: 'Trial accounts cannot use AI assistant' }), { status: 402 });
}
```

## 5. Registrar usuários com `org_id=NULL` existentes

```sql
-- Corrigir usuários que já se registraram sem organização
DO $$
DECLARE
    r RECORD;
    v_org_id UUID;
BEGIN
    FOR r IN SELECT id, email FROM profiles WHERE organization_id IS NULL LOOP
        v_org_id := gen_random_uuid();
        INSERT INTO organizations (id, name) VALUES (v_org_id, 'Minha Organização')
            ON CONFLICT DO NOTHING;
        UPDATE profiles SET organization_id = v_org_id WHERE id = r.id;
    END LOOP;
END $$;
```

## 6. Register.tsx

Adicionar campo "Nome da Empresa":
```tsx
<input placeholder="Nome da sua empresa" value={orgName} onChange={...} />

// No signUp:
supabase.auth.signUp({
    email, password,
    options: {
        data: {
            full_name: name,
            organization_name: orgName,  // NOVO
        }
    }
})
```

## 7. Ordem de Implementação

| # | Tarefa | Arquivo |
|---|--------|---------|
| 1 | Migration 071: trigger + usage_tracker + RPC + fix existentes | `supabase/migrations/` |
| 2 | `usageTracker.ts` service | `src/core/services/` |
| 3 | `Register.tsx` + campo empresa | `src/pages/auth/` |
| 4 | `UserContext.tsx` trial info | `src/core/contexts/` |
| 5 | Bloqueio PoolAddCandidate | `src/features/candidates/` |
| 6 | Bloqueio Batch Match | `src/pages/vagas/` |
| 7 | Bloqueio VagaForm | `src/pages/vagas/` |
| 8 | Esconder ChatWidget | `src/layouts/` |
| 9 | Bloqueio openai-proxy | `supabase/functions/` |
| 10 | Testes | `tests/` |
