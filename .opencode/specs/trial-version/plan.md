# Versão Trial (Self-Service) — Plano Detalhado

## Visão Geral

Qualquer pessoa acessa o site, registra e começa usar na hora.

**Limites mensais (reset todo dia 1º):**
| Limite | Trial |
|--------|-------|
| Análises | 15/mês |
| Vagas ativas | 3 |
| Pool (currículos) | 50 |
| ChatWidget IA | ❌ Bloqueado |

**Quando atinge o limite:** mensagem "Você usou todas as análises do mês. Volte dia 1º."

## Fluxo de Registro

```
┌─────────────────────────────────────────────────────────────────┐
│  Landing Page → Register                                        │
│                                                                 │
│  ┌─ Nome completo                                               │
│  ├─ Nome da Empresa          ← NOVO                             │
│  ├─ Email                                                       │
│  ├─ Senha                                                       │
│  ├─ Confirmar Senha                                             │
│  └─ [Criar conta]                                               │
│         ↓                                                       │
│  supabase.auth.signUp({ email, password,                        │
│      data: { full_name, organization_name } })                  │
│         ↓                                                       │
│  🔥 TRIGGER handle_new_user                                     │
│  ├─ org_id no metadata? NÃO → gera UUID + cria org              │
│  ├─ org_id no metadata? SIM (invite) → usa o que veio           │
│  ├─ role default: 'administrador' (não 'owner')                 │
│  └─ account_type: 'trial'                                       │
│         ↓                                                       │
│  📧 Edge Function: send-confirmation-email                      │
│  ├─ Template visual igual ao invite (logo cid, cores #2C58FD)   │
│  ├─ Botão "Confirmar Cadastro" → link Supabase Auth             │
│  └─ Enviado via Resend (from: noreply@space.pro.br)             │
│         ↓                                                       │
│  Usuário abre email → clica Confirmar                           │
│         ↓                                                       │
│  Redireciona pro Login → loga → sistema                         │
│                                                                 │
│  ⚠️  Se email não chegar / expirar:                             │
│     "Email já cadastrado" → botão [Reenviar confirmação]        │
│     Chama supabase.auth.resend() + reenvia Edge Function        │
└─────────────────────────────────────────────────────────────────┘
```

---

## PASSO A PASSO

### Step 1: Migration (trigger + usage_tracker + multi-org)

**Arquivo:** `supabase/migrations/071_trial_setup.sql`

#### 1.0 Multi-org: tabela `user_organizations`

```sql
CREATE TABLE IF NOT EXISTS user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'rh',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, organization_id)
);

ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uo: user_read_own" ON user_organizations FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "uo: admin_manage" ON user_organizations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_organizations uo
            WHERE uo.user_id = auth.uid()
            AND uo.organization_id = user_organizations.organization_id
            AND uo.role IN ('owner', 'administrador')
        )
    );
```

#### 1.0b Ajustar `get_my_org_id()` para multi-org

```sql
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT COALESCE(active_organization_id, organization_id)
    INTO v_org_id
    FROM profiles
    WHERE id = auth.uid();
    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';
```

#### 1.0c Adicionar `active_organization_id` em profiles

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_organization_id UUID;
```

#### 1.1 Fix trigger `handle_new_user`

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_org_id UUID;
    v_org_name TEXT;
    v_role TEXT;
BEGIN
    -- Invite flow: usa org_id do metadata
    -- Self-register: gera UUID novo
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
        active_organization_id,
        status, account_type, onboarding_completed
    ) VALUES (
        NEW.id, NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        v_role, v_org_id, v_org_name,
        v_org_id,
        'pending', 'trial', false
    )
    ON CONFLICT (id) DO UPDATE SET
        organization_id = COALESCE(EXCLUDED.organization_id, profiles.organization_id),
        organization_name = COALESCE(EXCLUDED.organization_name, profiles.organization_name),
        user_role = COALESCE(EXCLUDED.user_role, profiles.user_role);

    -- Multi-org: vincular usuário à organização
    INSERT INTO user_organizations (user_id, organization_id, role)
    VALUES (NEW.id, v_org_id, v_role)
    ON CONFLICT (user_id, organization_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
```

#### 1.2 Tabela `usage_tracker`

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

#### 1.3 RPC `increment_analysis_usage`

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

#### 1.4 Corrigir usuários existentes sem org

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

**Arquivo:** `supabase/migrations/071_trial_setup.sql`

(conteúdo acima)

---

### Step 1.5: Ajustar invite Edge Function (multi-org)

**Arquivo:** `supabase/functions/send-invite-email/index.ts`

O profile upsert atual sobrescreve `organization_id`. Com multi-org:
1. Manter o `organization_id` original do profile (org própria do usuário)
2. Inserir em `user_organizations` com a role do invite
3. Atualizar `active_organization_id` pra org do invite

```ts
await supabaseAdmin.from('user_organizations').upsert({
    user_id: userId,
    organization_id: orgId,
    role: targetRole,
}, { onConflict: 'user_id,organization_id' });

await supabaseAdmin.from('profiles').update({
    active_organization_id: orgId,
}).eq('id', userId);
```

---

### Step 2: Edge Function `send-confirmation-email`

**Arquivo:** `supabase/functions/send-confirmation-email/index.ts`

Mesma estrutura das outras 7 Edge Functions de email:
- `LOGO_BASE64` (mesma string)
- HTML template igual (logo cid, borda #2C58FD, footer)
- Resend API call
- `from: 'Usabit people <noreply@space.pro.br>'`

**Diferenças:**
- Sem autenticação (público, chamado do Register)
- Gera link de confirmação via GoTrue Admin API:
  ```
  POST /auth/v1/admin/generate_link
  { type: 'signup', email: userEmail }
  ```
- Texto: "Confirme seu cadastro na Usabit people"
- Botão: "Confirmar Cadastro"

---

### Step 3: Register.tsx

Adicionar:
- Campo "Nome da Empresa"
- Após `signUp` → chamar Edge Function `send-confirmation-email`
- Ao receber erro "User already exists" → mostrar:
  ```
  Email já cadastrado.
  [Reenviar email de confirmação]
  [Fazer login]
  ```

---

### Step 4: Service `usageTracker.ts`

```ts
// src/core/services/usageTracker.ts
export const TRIAL_LIMITS = {
    analyses: 15,
    vagas: 3,
    pool: 50,
};

export async function canDoAnalysis(orgId: string): Promise<boolean>
export async function useAnalysis(orgId: string): Promise<number> // retorna restantes
export async function canAddToPool(orgId: string): Promise<boolean>
export async function canCreateVaga(orgId: string): Promise<boolean>
export async function getRemaining(orgId: string): Promise<number>
```

---

### Step 5: UserContext — trial info

Adicionar ao profile:
```ts
interface TrialInfo {
    remainingAnalyses: number;
    poolLimit: number;
    poolUsed: number;
    vagasLimit: number;
    vagasUsed: number;
}
```

---

### Step 6: Barra de status (header)

Mostrar no topo do dashboard:
```
🟣 Trial · 8/15 análises restantes este mês
```

Quando zerar:
```
🟣 Trial · 0/15 análises — limite do mês atingido
```

---

### Step 7: Pontos de bloqueio

| Onde | O quê | Como |
|------|-------|------|
| **PoolAddCandidate** | Import sem análise disponível | Checar `canDoAnalysis()` antes; toast "Limite de análises do mês atingido" |
| **PoolAddCandidate** | Pool cheio (50) | Checar `canAddToPool()`; toast "Pool cheio (50/50)" |
| **PoolTalentos batch** | Match sem análise | A cada candidato: checar + `useAnalysis()`; para se zerar |
| **handleConfirmAnalyze** | Análise individual | Checar + `useAnalysis()` |
| **VagaForm** | Criar vaga (#4) | Checar `canCreateVaga()`; toast "Limite de 3 vagas ativas" |
| **Sidebar** | ChatWidget | Se `account_type === 'trial'` → `return null` |
| **openai-proxy** | Chamada direta | Verificar `account_type !== 'trial'` no início da Edge Function |

---

## PONTOS CEGOS

### 🔴 Invite flow não pode quebrar → RESOLVIDO

**Risco:** Modificar `handle_new_user` poderia quebrar convites.
**Solução:** O trigger verifica:
```sql
IF organization_id IS NOT NULL AND organization_id != '' 
   THEN v_org_id := (organization_id)::UUID;   -- invite: usa o que veio
   ELSE v_org_id := gen_random_uuid();          -- self-register: gera novo
END IF;
```
Invite flow **não é tocado** — o `organization_id` no metadata do GoTrue continua sendo usado.

---

### 🔴 Edge Function pública sem rate limit → RESOLVIDO

**Risco:** `send-confirmation-email` sem autenticação = spam.
**Solução:** Mesmo padrão das outras funções (`send-application-email`, `send-spontaneous-email`):
```ts
const ip = req.headers.get('x-forwarded-for') || 'unknown';
const { allowed } = await checkRateLimit(ip, 3, 3600); // 3 por IP por hora
if (!allowed) return new Response('Rate limit', { status: 429 });
```
Além disso, a Edge Function **valida se o email existe** no `auth.users` antes de enviar. Se não existir, retorna erro.

---

### 🟡 Supabase enviando email duplicado → RESOLVIDO

**Risco:** Supabase Auth + nossa Edge Function = 2 emails.
**Solução:** No Supabase Dashboard → **Authentication → Settings**:
- Desmarcar **"Enable email confirmations"** 
- OU em **Email Templates** → Confirm signup: deixar template vazio/comentado

Assim só nossa Edge Function envia o email customizado.

---

### 🟡 Contagem por candidato no batch match → RESOLVIDO

**Risco:** Batch de 10 conta 1 análise ou 10?
**Solução:** **1 análise = 1 candidato avaliado.** No loop do batch, cada candidato processado chama `useAnalysis(orgId)`. O RPC `increment_analysis_usage` é atômico (`ON CONFLICT DO UPDATE`), então 10 chamadas concorrentes = 10 incrementos.

---

### 🟡 SetPassword vs Register flow → RESOLVIDO

**Risco:** Auto-registro já define senha no `signUp`. O `SetPassword` é só pra invite. Se o UserContext redirecionar errado, o usuário cai no SetPassword sem precisar.
**Solução:** `App.tsx` já verifica `type=signup` ou `type=invite` no hash da URL pra redirecionar ao SetPassword. Como nosso email de confirmação usa o link padrão do Supabase (`/auth/v1/verify?type=signup`), o redirecionamento funciona igual. O usuário confirma → o hash some → vai pro login normal. **SetPassword NÃO aparece** pra self-register com senha (só aparece pra invite onde o hash tem `type=invite`).

---

### 🟢 Email de confirmação vs Reset de senha → OK

**Solução:** Usar o mesmo template visual (`LOGO_BASE64`, cores, footer). O Reset de senha já é gerenciado pelo Supabase Auth — o template pode ser customizado no Dashboard.

---

### 🟢 Multi-org (convidado ter 2 orgs) → RESOLVIDO

**Solução:** Tabela `user_organizations` permite múltiplos vínculos. `profiles.active_organization_id` define qual org está ativa pro RLS. `get_my_org_id()` lê da ativa.

**Fluxo invite multi-org:** A Edge Function de invite também insere em `user_organizations` + atualiza `active_organization_id` se for a primeira org convidada. O usuário mantém acesso à sua org trial original.

**Org switcher (futuro):** Dropdown no header pra alternar entre orgs. Por enquanto, `active_organization_id` é setado automaticamente.

