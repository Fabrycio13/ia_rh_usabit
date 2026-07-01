# Plano de Implementação — Versão Trial

> **Status:** Planejado | **Branch:** `usanit-people-v_1.3` | **Data:** 30/06/2026

---

## Visão Geral

**Objetivo:** Qualquer pessoa acessa o site, registra com nome + empresa + email + senha, e começa a usar na hora com limites mensais.

**Limites da Trial:**

| Recurso | Limite | Reset |
|---------|--------|-------|
| Análises (IA) | 15/mês | Dia 1 |
| Vagas ativas | 3 | — |
| Pool (currículos) | 50 | — |
| ChatWidget IA | ❌ Bloqueado | — |

**Quando atinge o limite:** toast informativo — "Você usou todas as X análises do mês. O limite resetará no dia 1º."

---

## Arquitetura — O que muda no sistema

### Única tabela nova

```sql
usage_tracker (organization_id, period_month, analyses_used)  -- controle de uso
```

### Único campo novo

Nenhum. Sem `user_organizations`, sem `active_organization_id`. **Multi-org não existe na trial.**

### Trigger modificado

`handle_new_user` — gera UUID + cria org automaticamente quando `organization_id` não vem no metadata (self-register). Invite flow **intocado**.

### Função RLS

`get_my_org_id()` — **não muda**.

### Edge Function nova

`send-confirmation-email` — envia email de confirmação com template visual Usabit.

---

## Tasks

### T-01: Migration `071_trial_setup.sql` [P0]

**Dependências:** Nenhuma  
**Arquivo:** `supabase/migrations/071_trial_setup.sql`  
**Tempo:** ~5 min

#### 1. Substituir `handle_new_user`

Mesma lógica de hoje, só adiciona geração automática de org.

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

    -- Criar organização
    INSERT INTO organizations (id, name)
    VALUES (v_org_id, v_org_name)
    ON CONFLICT (id) DO NOTHING;

    -- Criar perfil
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

**Garantias:**
- ✅ Invite: `organization_id` existe no metadata → usa ele (invite flow intacto)
- ✅ Self-register: `organization_id` NÃO existe → gera UUID + cria org
- ✅ `ON CONFLICT (id) DO UPDATE` não quebra perfil existente (invite upsert)
- ✅ `SECURITY DEFINER` → trigger ignora RLS de organizations
- ✅ Role default: `administrador` (não `owner`) — escopo multi-tenant correto

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
```

#### 6. Criar RPC `increment_analysis_usage`
```sql
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

#### 3. Corrigir usuários existentes com `organization_id=NULL`

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

**Dependências:** Nenhuma (usa APIs externas)  
**Arquivo:** `supabase/functions/send-confirmation-email/index.ts`

**Estrutura:**
- Mesmo `LOGO_BASE64` + HTML template das outras funções de email
- Rate limit: `checkRateLimit(ip, 3, 3600)` — 3 envios por IP por hora
- Chama GoTrue Admin API pra gerar link:
  ```ts
  POST https://[ref].supabase.co/auth/v1/admin/generate_link
  Headers: { Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY }
  Body: { type: 'signup', email: userEmail }
  ```
- Monta email com botão "Confirmar Cadastro" apontando pro `action_link`
- Envia via Resend API
- Se email não existe no `auth.users` → erro 400

**Teste rápido:** Deploy → chamar com curl/Postman → verificar se email chega

---

### T-03: `Register.tsx` — campo empresa + Edge Function [P0]

**Dependências:** T-01, T-02  
**Arquivo:** `src/pages/auth/Register.tsx`

#### Mudanças:
1. **Campo novo:** "Nome da Empresa" (obrigatório, min 2 caracteres)
2. **Após `signUp` sucesso:** chamar Edge Function
   ```ts
   const { data, error } = await supabase.auth.signUp({...});
   if (!error && data.user) {
       await supabase.functions.invoke('send-confirmation-email', {
           body: { email, name }
       });
   }
   ```
3. **Erro "User already exists":** mostrar:
   ```
   Email já cadastrado.
   Verifique sua caixa de entrada ou clique abaixo.
   [Reenviar email de confirmação]
   Já confirmou seu cadastro? [Fazer login]
   ```
4. **"Reenviar email":** chamar `supabase.auth.resend({ type: 'signup', email })` + Edge Function de novo

---

### T-04: Service `usageTracker.ts` [P1]

**Dependências:** T-01  
**Arquivo:** `src/core/services/usageTracker.ts`

```ts
const TRIAL_LIMITS = { analyses: 15, vagas: 3, pool: 50 };

export async function canDoAnalysis(orgId: string): Promise<boolean>
// Verifica se analyses_used < 15 no mês atual

export async function useAnalysis(orgId: string): Promise<number>  
// Chama RPC increment_analysis_usage → retorna quantas restam

export async function canAddToPool(orgId: string): Promise<boolean>
// SELECT COUNT(*) FROM candidates WHERE org_id = ? → < 50

export async function canCreateVaga(orgId: string): Promise<boolean>
// SELECT COUNT(*) FROM vagas_white_label WHERE org_id = ? AND is_active → < 3

export async function getRemaining(orgId: string): Promise<number>
// Retorna análises restantes: 15 - analyses_used do mês
```

---

### T-05: `UserContext.tsx` — trial info [P1]

**Dependências:** T-01  
**Arquivo:** `src/core/contexts/UserContext.tsx`

Adicionar ao `loadProfile()`:
```ts
const { data: usage } = await supabase.from('usage_tracker')
    .select('analyses_used')
    .eq('organization_id', profile.organization_id)
    .eq('period_month', new Date().toISOString().slice(0, 7))
    .maybeSingle();

profile.trialInfo = {
    remainingAnalyses: 15 - (usage?.analyses_used ?? 0),
    poolLimit: 50,
    vagasLimit: 3,
};
```

---

### T-06: Barra de status no header [P2]

**Dependências:** T-05  
**Arquivo:** `src/layouts/DashboardLayout.tsx` ou componente separado

Mostrar no topo:
```tsx
if (profile.account_type === 'trial') {
    const remaining = profile.trialInfo.remainingAnalyses;
    return (
        <div style={{ background: 'rgba(139,92,246,0.1)', ... }}>
            🟣 Trial · {remaining}/15 análises restantes este mês
        </div>
    );
}
```

---

### T-07: Bloqueios nos fluxos [P1]

**Dependências:** T-04

| # | Onde | Como |
|---|------|------|
| 7a | **PoolAddCandidate** | Antes de importar: `await canDoAnalysis(orgId)` + `await canAddToPool(orgId)`. Se não, toast + return. |
| 7b | **PoolTalentos batch** | No loop do batch: cada candidato chama `await canDoAnalysis(orgId)`. Se zerar, para com toast. Após cada análise: `await useAnalysis(orgId)`. |
| 7c | **handleConfirmAnalyze** | Antes da análise individual: `await canDoAnalysis(orgId)`. Se ok, após: `await useAnalysis(orgId)`. |
| 7d | **VagaForm** | Ao criar vaga: se `account_type === 'trial'`, `await canCreateVaga(orgId)`. |
| 7e | **Sidebar ChatWidget** | `if (profile.account_type === 'trial') return null` — não renderiza. |
| 7f | **openai-proxy Edge Function** | No início: buscar `account_type` do profile. Se trial, retornar 402. |

---

### T-08: Ajustar invite Edge Function [P1]

**Dependências:** T-01  
**Arquivo:** `supabase/functions/send-invite-email/index.ts`

Adicionar ao final (após criar perfil):
```ts
// Multi-org: vincular à organização convidada
await supabaseAdmin.from('user_organizations').upsert({
    user_id: userId,
    organization_id: organizationId,
    role: targetRole,
}, { onConflict: 'user_id,organization_id' });

// Ativar org do invite como ativa
await supabaseAdmin.from('profiles').update({
    active_organization_id: organizationId,
}).eq('id', userId);
```

---

## Ordem de Execução

```
T-01 (migration) ──┬── T-03 (Register.tsx)       ──┬── T-07a,b,c,d,e (bloqueios)
                   │                                 │
T-02 (email EF)  ──┤                                 │
                   │                                 │
T-08 (invite EF) ──┘                                 │
                                                     │
T-04 (usageTracker) ── T-05 (UserContext) ── T-06 (barra) ─┘
                                                     │
T-07f (openai-proxy bloqueio) ───────────────────────┘
```

**Paralelizável:** T-01 + T-02 + T-08 (3 branches independentes)
**Sequencial:** T-04 → T-05 → T-06 (dependem um do outro)
**Sequencial:** T-07 (depende de T-04)

---

## Pontos Cegos

### 🔴 T-01: Trigger quebrar invite flow

**Risco:** Modificar `handle_new_user` pode quebrar convites existentes.
**Solução:** `IF organization_id IS NOT NULL → usa o que veio` no metadata. Invite continua usando o `org_id` que o admin passou.
**Teste:** Após deploy, criar um convite pelo AdminDashboard e verificar se o convidado entra na org correta.

### 🔴 T-01: `get_my_org_id()` alterado — todas as RLS usam

**Risco:** Se a função quebrar, **todas** as queries RLS falham (candidates, vagas, jobs, etc).
**Solução:** A função só adiciona `COALESCE(active_organization_id, organization_id)`. O fallback garante que usuários existentes (sem `active_organization_id`) continuem funcionando.
**Teste:** Rodar `SELECT get_my_org_id()` como usuário logado após o deploy.

### 🔴 T-02: Edge Function exposta a spam

**Risco:** `send-confirmation-email` é pública (sem JWT). Alguém pode spammar envios.
**Solução:** `checkRateLimit(ip, 3, 3600)` + validar que o email existe no `auth.users` antes de enviar.
**Teste:** Chamar a função 4 vezes seguidas → 4ª deve retornar 429.

### 🟡 T-01: Usuários existentes sem org

**Risco:** O `DO $$` loop corrige, mas se houver MUITOS usuários sem org, pode demorar.
**Solução:** É um loop por cursor, geralmente poucos registros. O `ON CONFLICT DO NOTHING` evita duplicatas.
**Mitigação:** Rodar o `DO $$` separadamente do resto da migration, se preocupante.

### 🟡 T-03: SignUp falha mas Edge Function roda

**Risco:** Se `signUp` falhar (email duplicado, senha fraca), mas o código continuar e chamar a Edge Function.
**Solução:** Só chamar a Edge Function se `!error && data.user`. O `if` já existe.
**Teste:** Tentar registrar com email já existente → Edge Function NÃO deve ser chamada.

### 🟡 T-07b: Batch match consome análises mesmo se falhar

**Risco:** Se o batch match falhar no meio (erro de IA), as análises já consumidas não voltam.
**Solução:** Só chamar `useAnalysis(orgId)` **após** o match do candidato ser bem-sucedido (dentro do `try` block, após o `await Promise.all`).
**Teste:** Simular erro de IA no batch → contador não deve ter incrementado.

### 🟡 T-07f: openai-proxy sem acesso ao `account_type`

**Risco:** A Edge Function `openai-proxy` autentica via JWT mas não busca o `account_type` do profile. Se não buscar, não sabe se é trial.
**Solução:** Adicionar query no início:
```ts
const { data: profile } = await supabaseAdmin.from('profiles')
    .select('account_type').eq('id', userId).single();
if (profile?.account_type === 'trial') return error 402;
```
**Teste:** Chamar openai-proxy com token de trial user → deve retornar 402.

### 🟢 T-03: Usuário fecha o browser antes da Edge Function

**Risco:** SignUp OK, trigger OK (org criada), mas usuário fecha antes da Edge Function enviar email.
**Solução:** O "Reenviar email de confirmação" resolve. O usuário tenta registrar de novo → vê o botão de reenvio.
**Impacto:** Org criada mas nunca usada. Não custa nada.

### 🟢 T-08: Invite cria `active_organization_id` mas usuário perde org anterior

**Risco:** Convidado tinha org trial própria. Invite atualiza `active_organization_id` pra org convidada. Ele "perde" acesso à org trial?
**Solução:** Não perde. `active_organization_id` só define qual org o RLS filtra. Os dados da org trial continuam lá. Futuro: org switcher no header pra alternar.
**Impacto:** Por enquanto, o usuário vê a org convidada. Pra voltar pra sua org trial, precisa de um seletor de org (fora do escopo da V1).

---

## Checklist de Verificação

- [ ] **T-01:** Migration roda sem erro no SQL Editor do Supabase
- [ ] **T-01:** `SELECT get_my_org_id()` retorna UUID válido
- [ ] **T-01:** Criar usuário novo → org criada automaticamente
- [ ] **T-01:** Convidar usuário existente → `user_organizations` tem registro
- [ ] **T-02:** Edge Function deploy → curl retorna 200
- [ ] **T-02:** Edge Function com IP > 3 chamadas → retorna 429
- [ ] **T-03:** Registrar com dados válidos → email chega
- [ ] **T-03:** Registrar email duplicado → mostra botão "Reenviar"
- [ ] **T-03:** Clicar "Reenviar" → email chega de novo
- [ ] **T-04:** `canDoAnalysis` retorna true (0 usadas) e false (15 usadas)
- [ ] **T-04:** `useAnalysis` incrementa e retorna restantes corretamente
- [ ] **T-07a:** Pool cheio → não deixa importar
- [ ] **T-07a:** Sem análises → não deixa importar
- [ ] **T-07b:** Batch match para ao zerar análises
- [ ] **T-07d:** Criar 4ª vaga → bloqueado
- [ ] **T-07e:** ChatWidget não aparece pra trial
