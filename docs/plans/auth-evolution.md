# Plano: Auth Evolution — OAuth + Magic Link + Trigger Fix + Anti-Takeover

> **Status**: 📋 Documento de planejamento. **NÃO IMPLEMENTADO**.
> Aguardando aprovação do time antes de qualquer execução.
>
> **Versão**: 2.0 (revisada) — **15 pontos cegos identificados** e mitigados.
> Mudanças vs versão 1.0: FASE 0 ampliada (CSP + verificação Google), FASE 3 ampliada (anti-takeover simplificado), FASE 6 ampliada (testes extras), decisões 11 e 13 revisadas.

## Conceito

Evoluir o sistema de autenticação atual (Supabase Auth email/senha) adicionando:

1. **OAuth Social** (Google + Microsoft) — login com 1 clique
2. **Magic Link** (login por e-mail, sem senha, válido 24h)
3. **Correção do Trigger** — trial user deixa de virar `owner` (bug de segurança)
4. **Account Linking** — vincular/desvincular métodos em `/configuracoes`
5. **Feature Flags por Org** — rollout controlado
6. **Anti-Takeover** simplificado — logar + banner de confirmação por email

MFA TOTP (autenticação em duas etapas) **fica para fase futura** (após esta entrega).

> 📌 **Status**: Este documento foi revisado e 15 pontos cegos foram identificados. Ver seção "Pontos Cegos Identificados na Revisão" abaixo.

---

## Arquitetura Atual (NÃO PODE QUEBRAR)

```
┌─────────────────────────────────────────────────────────────────┐
│ FLUXO 1 — TRIAL (Landing Page → Cadastro self-service)         │
│                                                                 │
│  LandingPage → Register.tsx → supabase.auth.signUp()           │
│       ↓                                                          │
│  Trigger `handle_new_user` cria profile (account_type='trial') │
│       ↓                                                          │
│  Confirma e-mail → OnboardingModal → /dashboard                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ FLUXO 2 — CONVITE (Owner/Admin convida alguém)                 │
│                                                                 │
│  AdminDashboard.handleCreateUser() → Edge Function              │
│       ↓                                                          │
│  send-invite-email:                                             │
│    1. Valida JWT do caller (hierarquia)                         │
│    2. generate_link(type='invite') → cria auth.users            │
│    3. UPSERT profile com role + organization_id corretos        │
│    4. Envia e-mail via Resend com link → /set-password          │
│       ↓                                                          │
│  Usuário clica → SetPassword.tsx → updateUser(password)        │
│       ↓                                                          │
│  signOut() + redirect /login → fluxo normal                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🐛 Bug Pré-existente (CRÍTICO — corrigir nesta entrega)

O trigger `handle_new_user` em `supabase/migrations/026_robust_user_trigger.sql:15`:

```sql
target_role := COALESCE(new.raw_user_meta_data->>'user_role', 'owner');
```

**Problema**: `Register.tsx` **não passa `user_role`** no metadata. Resultado: **todo trial vira `owner` (super-admin do SaaS)**, dando acesso indevido via RLS a dados de outras organizações.

**Correção**: Migration `064_fix_trial_role_default.sql` muda o default para `'administrador'`.

> Garantia: `CREATE OR REPLACE FUNCTION` afeta apenas **novos signups**. Profiles existentes não são alterados. Convites via Edge Function não são afetados (ela faz UPSERT sobrescrevendo role).

---

## Decisões de Design (15 decisões consolidadas — revisadas)

| # | Decisão | Escolha | Justificativa |
|---|---------|---------|---------------|
| 1 | Trigger default | `'administrador'` | Corrige bug de segurança |
| 2 | Recovery OAuth | Detectar via `user.identities[]` (não `app_metadata.provider`) | `identities[]` reflete TODOS os métodos vinculados |
| 3 | Account Linking | Permitido em `/configuracoes` | Flexibilidade para o usuário |
| 4 | Magic Link validade | 24 horas | Conveniência sem sacrificar segurança |
| 5 | Magic Link escopo | Só login (não cadastro) | Cadastro OAuth = mais simples |
| 6 | MFA TOTP | ⏸️ Fase futura | Não inflar escopo |
| 7 | Feature flag | Por organização | Rollout controlado |
| 8 | MFA no schema | **APENAS** `mfa_enabled` (Supabase MFA já gerencia secret em `auth.mfa_factors`) | Sem duplicação de storage |
| 9 | Sessão | 1 semana (padrão Supabase) | Suficiente para SaaS |
| 10 | Avatar Google | Sincronizar do provider | UX mais rica |
| 11 | Avatar Microsoft | ❌ Microsoft NÃO expõe avatar público | Não sincronizar |
| 12 | Email mismatch | Bloquear OAuth se email ≠ `invited_email` | Segurança anti-takeover |
| 13 | Anti-takeover | **Simplificado**: logar + banner persistente + features limitadas | UX melhor (não força 2º login) |
| 14 | Apple Sign In | ❌ Não nesta entrega | Sem app mobile ainda |
| 15 | Ordem botões | Google → Microsoft → Magic Link → email/senha | Google é o mais usado no Brasil |
| 16 | Open Redirect | Validar `redirectTo` contra whitelist | Segurança |
| 17 | Google OAuth em prod | ⚠️ Domínio precisa ser **verificado** (4-6 semanas) | Pode bloquear rollout |

---

## Escopo da Entrega

### O que ENTRA (3 semanas)

| Feature | Descrição |
|---|---|
| OAuth Google | Botão "Entrar com Google" |
| OAuth Microsoft | Botão "Entrar com Microsoft" |
| Magic Link | Botão "Entrar com link por e-mail" (24h, só login) |
| AuthCallback | Página `/auth/callback` unificada |
| Trigger Fix | Migration 064 corrige default `'owner'` → `'administrador'` |
| Account Linking | Vincular/desvincular métodos em `/configuracoes → Segurança` |
| Feature Flag por Org | Tabela `organization_settings.enable_oauth` |
| SetPassword OAuth-aware | Detectar OAuth e mostrar "Use Google" |
| Audit Log | Tabela `auth_audit_log` para logins |
| Avatar Sync | Foto do Google/Microsoft salva no profile |
| Email Mismatch Block | Bloquear OAuth se email ≠ `invited_email` |
| Anti-Takeover | Tela de confirmação por email |

### O que FICA PARA DEPOIS (próxima fase)

- MFA TOTP (obrigatório para Owner/Admin/Supervisor)
- Recuperação de MFA por email
- Backup codes
- SSO empresarial real (SAML/OIDC via WorkOS)
- Apple Sign In
- Login com LinkedIn / GitHub

---

## Plano de Implementação (6 fases)

### FASE 0 — Preparação (1 dia) ⚠️ ajustada após revisão

- [ ] Criar pasta `specs/auth-evolution/`
- [ ] **Verificar CSP atual** em `index.html` e `vite.config.ts` — adicionar domínios OAuth:
  ```
  script-src 'self' https://accounts.google.com https://login.microsoftonline.com;
  frame-src 'self' https://accounts.google.com https://login.microsoftonline.com;
  img-src 'self' data: https://*.googleusercontent.com https://graph.microsoft.com;
  ```
- [ ] **Google Cloud Console**:
  - Criar projeto OAuth
  - ⚠️ **Submeter app para verificação de domínio** (4-6 semanas para produção)
  - Workaround dev: marcar como "External" + Testing com até 100 test users
  - Configurar Redirect URI: `https://usabit.github.io/rh-ia-v2/#/auth/callback`
- [ ] **Azure Portal** (App registrations):
  - Criar app
  - Tipo: "Accounts in any organizational directory and personal Microsoft accounts"
  - Redirect URI (SPA): `https://usabit.github.io/rh-ia-v2/#/auth/callback`
- [ ] **Ativar Google + Azure no Supabase Dashboard** (Authentication → Providers)
  - Colar Client ID + Secret
  - ✅ **Não** habilitar "Skip nonce checks" (mantém segurança)
- [ ] Adicionar variáveis no `.env.example`:
  - `VITE_GOOGLE_CLIENT_ID`
  - `VITE_AZURE_CLIENT_ID`
- [ ] Verificar e documentar **allowed redirect URLs** no Supabase:
  - Site URL: `https://usabit.github.io/rh-ia-v2/`
  - Additional Redirect URLs: `https://usabit.github.io/rh-ia-v2/#/auth/callback`

---

### FASE 1 — Banco de Dados (2 dias)

> ⚠️ **Ordem de execução obrigatória**: `064 → 065 → 066 → 067`
> Aplicar em **staging primeiro** antes de produção.

#### Migration 064 — Trigger Fix
- Atualizar `handle_new_user()` para default `'administrador'` (em vez de `'owner'`)
- Adicionar `account_type` default `'trial'` para novos signups
- **Não migrar profiles existentes** com `user_role='owner'` (decisão consciente: risco de mudar role errado em produção)
- **Interação com Edge Function** (`send-invite-email`):
  - Edge Function UPSERT define `account_type='active'` (linha 218)
  - Trigger define `account_type='trial'` por padrão
  - Ordem: trigger primeiro (sync), Edge Function depois (override)
  - ✅ Resultado final: convidado = `active`, trial = `trial`
- Validar:
  - Novo signup via `signUp` → `user_role='administrador'`, `account_type='trial'` ✅
  - Convite via Edge Function → role + `account_type='active'` corretos ✅
  - Profiles existentes **não alterados** ✅

#### Migration 065 — Feature Flags por Org
```sql
CREATE TABLE organization_settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id),
    enable_oauth BOOLEAN DEFAULT TRUE,    -- ⚠️ DEFAULT TRUE (corrige ponto cego)
    enable_magic_link BOOLEAN DEFAULT TRUE,
    session_duration_hours INT DEFAULT 168,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
- ⚠️ **Ponto cego identificado**: default `TRUE` (não `FALSE`). Caso contrário, novos trials via OAuth veem botões escondidos mas acabaram de logar com OAuth.
- RLS: apenas Owner/Admin da org pode ler/escrever
- Seed: criar `organization_settings` para todas orgs existentes (com `enable_oauth=TRUE` por padrão)
- Edge case: org criada **antes** desta migration → seed adiciona settings com `TRUE`. OK.

#### Migration 066 — Anti-Takeover + Campos Novos
Adicionar colunas em `profiles`:
- `invited_email TEXT NULL` (email original do convite, se houver)
- `pending_oauth_confirmation BOOLEAN DEFAULT FALSE`
- `oauth_confirmation_token UUID NULL`
- `oauth_confirmation_sent_at TIMESTAMPTZ NULL`
- `auth_method TEXT NULL` (`'password' | 'google' | 'azure' | 'magic_link'`) — atualizado em cada login
- `avatar_synced_from_provider BOOLEAN DEFAULT FALSE`
- `mfa_enabled BOOLEAN DEFAULT FALSE` ← (preparação fase futura, **Supabase MFA já gerencia o secret internamente**)

⚠️ **Ponto cego corrigido**: coluna `mfa_secret_encrypted` removida. Supabase MFA armazena em `auth.mfa_factors` (não duplicar storage).

Índice em `oauth_confirmation_token`.

**Backfill** (opcional, recomendado):
```sql
-- Preencher auth_method para usuários existentes baseado em auth.users
UPDATE profiles p
SET auth_method = (
    SELECT CASE
        WHEN raw_app_meta_data->>'provider' = 'google' THEN 'google'
        WHEN raw_app_meta_data->>'provider' = 'azure' THEN 'azure'
        WHEN raw_app_meta_data->>'provider' = 'email' THEN 'password'
        ELSE 'password'
    END
    FROM auth.users u
    WHERE u.id = p.id
)
WHERE auth_method IS NULL;
```

#### Migration 067 — Audit Log
```sql
CREATE TABLE auth_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    organization_id UUID REFERENCES organizations(id),
    event_type TEXT NOT NULL, -- login_success, login_failure, oauth_login, magic_link_sent, invite_sent, etc.
    auth_method TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries comuns
CREATE INDEX idx_auth_audit_user_created ON auth_audit_log (user_id, created_at DESC);
CREATE INDEX idx_auth_audit_org_created ON auth_audit_log (organization_id, created_at DESC);
CREATE INDEX idx_auth_audit_event_type ON auth_audit_log (event_type, created_at DESC);
```
- RLS: Owner/Admin pode ler; INSERT via service_role (Edge Functions)
- ⚠️ **LGPD**: IP addresses precisam de política de retenção (criar job de purge após 365 dias)

---

### FASE 2 — Edge Functions (2 dias)

#### Update `send-invite-email`
- No UPSERT do profile, salvar `invited_email = email`
- Adicionar INSERT em `auth_audit_log` (event_type: `invite_sent`)

#### Criar `magic-link-email`
- Customizar template de email do magic link (estilo Usabit)
- Deploy: `npx supabase functions deploy magic-link-email`

#### Criar `oauth-confirmation-email`
- Gerar token UUID, salvar em `profiles.oauth_confirmation_token`
- Enviar email com link `/auth/confirm-oauth?token=xxx`
- Endpoint `/auth/confirm-oauth-callback` valida token e ativa profile

---

### FASE 3 — Frontend Auth Components (4 dias) ⚠️ ajustada após revisão

#### Criar `AuthCallback`
- Aguardar `profile.loaded === true`
- Detectar método ativo via `user.identities[].provider` (não `app_metadata.provider`!)
- Lógica de decisão:
  ```
  1. Buscar user via supabase.auth.getUser()
  2. Listar identities: user.identities[]
  3. Se invited_email existe E user.email !== invited_email:
     → BLOQUEAR: mostrar erro + signOut() + redirect /login
  4. Se invited_email existe E user.email === invited_email:
     → É OAuth no email convidado. Anti-takeover: 
       - Set profile.pending_oauth_confirmation = true
       - Gerar oauth_confirmation_token UUID
       - Edge Function oauth-confirmation-email envia email
       - Redirecionar para /dashboard com banner persistente
  5. Se NÃO invited_email (é trial novo):
     → Login normal. Redirect baseado em role.
  6. Magic link redirect (signInWithOtp):
     → Se já existe profile → login normal
     → Se NÃO existe profile → criar profile (JIT) e ir para onboarding
  ```

#### Criar `OAuthConfirmBanner` (componente novo)
- Banner persistente no topo do dashboard se `profile.pending_oauth_confirmation === true`
- Mensagem: "Confirme seu email para liberar todas as features"
- Botão "Reenviar email" (cooldown 60s)
- ⚠️ **Ponto cego corrigido**: fluxo simplificado — user NÃO precisa logar 2x
- Features limitadas enquanto pendente:
  - ❌ Não pode criar vaga
  - ❌ Não pode convidar usuário
  - ✅ Pode ler dados (dashboard, vagas existentes)
  - ✅ Pode analisar candidatos existentes

#### Criar `MagicLinkSent`
- Tela "Verifique seu email — enviamos um link de acesso"
- Botão "Reenviar link" com cooldown 60s
- Botão "Trocar email" (volta para /login)

#### Editar `Login.tsx`
- Adicionar `<OAuthButtons />` antes do formulário
- Ordem: Google → Microsoft → Magic Link → divider → email/senha
- Botão "Entrar com link por email" → `signInWithOtp({ emailRedirectTo: ${origin}/#/auth/callback })`
- **Open Redirect Protection**: validar `redirectTo` contra whitelist (origem atual + `/auth/callback` apenas)

#### Editar `Register.tsx`
- Adicionar `<OAuthButtons />` ANTES do formulário
- ⚠️ **Ponto cego corrigido**: `signInWithOAuth` faz ambos (login se existe, signup se não). NÃO misturar com `signUp`.
- `signInWithOAuth` NÃO passa por `isDisposableEmail` (Google valida)
- `signInWithOAuth` NÃO passa por honeypot (popup do Google exige humano)

#### Editar `SetPassword.tsx`
- Ao montar: `supabase.auth.getSession()` → se sessão existe, `getUser()` e checar `user.identities[]`
- Se tem identity `google`/`azure`:
  - Esconder campo senha
  - Mostrar "Você acessou via Google. Sua conta está pronta."
  - Botão "Ir para o dashboard"
  - ⚠️ NÃO chamar `updateUser({ password })` para OAuth users (quebraria fluxo)
  - NÃO chamar `signOut()` (perderia a sessão)
- Se tem só `email`: manter fluxo atual (definir senha)

#### Criar `OAuthButtons` (componente reutilizável)
- Props: `mode: 'login' | 'register'`
- Ler `enable_oauth` da org → se desabilitado, não renderiza
- **Importante**: botões Microsoft NÃO devem mostrar avatar (Microsoft Graph API não expõe foto pública)

#### Adicionar rotas em `App.tsx`
- `/auth/callback` (OAuth + Magic Link redirect)
- `/auth/confirm-oauth` (clique no email de confirmação anti-takeover)
- `/auth/magic-link-sent` (tela após solicitar link)

#### Magic Link Rate Limiting
- ⚠️ **Ponto cego**: Supabase tem rate limit built-in (~4 emails/hora por endereço). Não burlar.
- UI: desabilitar botão "Enviar" por 60s após cada envio
- Backend: log de tentativas excessivas (possível ataque)

---

### FASE 4 — Account Linking (2 dias)

#### Criar `SecurityPanel.tsx` em `/configuracoes`
- Listar métodos de auth vinculados
- Botão "Vincular Google" → `supabase.auth.linkIdentity({ provider: 'google' })`
- Botão "Vincular Microsoft" → `linkIdentity({ provider: 'azure' })`
- Botão "Desvincular" → `supabase.auth.unlinkIdentity(identity)`
- Bloquear "Desvincular senha" se for o único método (anti-lockout)

#### Bloquear alteração de email para OAuth users
- Em `Configuracoes.tsx`, desabilitar input de email se `auth_method === 'google' | 'azure'`

---

### FASE 5 — UserContext + Avatar Sync (1 dia)

- Editar `src/core/contexts/UserContext.tsx`
- Adicionar campo `auth_method` no `UserProfile` interface
- ⚠️ **Ponto cego corrigido**: detectar `auth_method` via `user.identities[].provider`:
  ```ts
  const identity = user.identities?.[0];
  const auth_method = identity?.provider === 'google' ? 'google'
                    : identity?.provider === 'azure' ? 'azure'
                    : identity?.provider === 'email' ? 'password'
                    : 'password';
  ```
- **Não usar** `app_metadata.provider` (reflete apenas último provider usado, não todos os vinculados)
- Adicionar campo `pending_oauth_confirmation`, `invited_email`, `mfa_enabled`
- Carregar `avatar_url` do provider OAuth na primeira vez:
  - Google: `user.user_metadata.avatar_url` (URL pública)
  - Microsoft: ❌ não expõe foto pública — manter avatar manual
- Salvar `full_name` em `profiles.name` se profile.name estiver vazio (OAuth user tem nome no metadata)
- Helper `hasOAuthMethod(profile)` — retorna true se tem identity google/azure
- Helper `hasPasswordMethod(profile)` — retorna true se tem identity email
- Helper `isMfaRequired(profile)` — true se `user_role IN ('owner', 'administrador', 'supervisor')` (preparação fase futura)

---

### FASE 6 — QA + Edge Cases (3-4 dias) ⚠️ ajustada após revisão

#### Testes Manuais — Regressão (NÃO PODE QUEBRAR)
- [ ] Login email/senha
- [ ] Cadastro trial (Register)
- [ ] Onboarding modal aparece (fluxo `setup` para trial novo)
- [ ] Esqueci senha
- [ ] Convite Owner→Admin (cria senha, entra)
- [ ] Convite Admin→RH/Supervisor/Convidado
- [ ] Logout
- [ ] /admin (Owner/Admin)
- [ ] **Cenário descoberto na revisão**: trial user JÁ EXISTENTE com `user_role='owner'` (bug antigo) — login continua funcionando, role NÃO é alterado

#### Testes Manuais — Novas Features
- [ ] Login com Google (trial novo) → cria profile como `administrador`
- [ ] Login com Google (convidado existente, mesmo email) → entra com role correto + banner anti-takeover
- [ ] Login com Google (email DIFERENTE do convite) → BLOQUEADO com erro
- [ ] Login com Google (1ª vez) → avatar Google sincronizado + full_name salvo
- [ ] Login com Microsoft → entra (avatar NÃO sincronizado)
- [ ] Magic Link solicitado → email recebido → clica → logado via `/auth/callback`
- [ ] Magic Link expirado (>24h) → erro tratado
- [ ] Magic Link rate limit (>4/hora) → bloqueado pelo Supabase
- [ ] Magic Link "Reenviar" → funciona após 60s
- [ ] Vincular Google a conta existente (que tem senha) → ambos métodos funcionam
- [ ] Desvincular senha (tendo Google) → entra só com Google
- [ ] Tentar desvincular senha SENDO único método → BLOQUEADO pelo UI
- [ ] Anti-takeover banner: convidado entra com Google (mesmo email) → banner persistente + email enviado
- [ ] Confirmar email via link → banner desaparece + features liberadas
- [ ] Org com `enable_oauth = false` → botões OAuth não aparecem
- [ ] Org NOVA (trial) com `enable_oauth = true` (default) → botões aparecem

#### Testes Manuais — Trigger
- [ ] Novo signup trial → `user_role='administrador'`, `account_type='trial'`
- [ ] Convite via Edge Function → role correta, `account_type='active'`
- [ ] Profiles existentes NÃO são alterados (verificar 5 perfis aleatórios no banco)
- [ ] SignUp OAuth Google → trigger cria profile com `administrador` corretamente

#### Testes de Segurança
- [ ] CSP não bloqueia OAuth popups (verificar console do browser)
- [ ] Open Redirect: tentar `redirectTo=https://evil.com` → bloqueado
- [ ] Magic Link em janela anônima → funciona (1º login)
- [ ] Magic Link em janela anônima após uso → falha (one-time use)
- [ ] account take-over: tentar login Google com email de OUTRA pessoa → bloqueado
- [ ] audit_log registra login_success, login_failure, oauth_login, magic_link_sent
- [ ] audit_log NÃO vaza IP/User-Agent em logs de produção (LGPD) — confirmar via DPO

#### Testes Mobile/Responsive
- [ ] Botões OAuth em tela pequena (< 400px) → responsivos
- [ ] Popup Google em mobile → funciona
- [ ] Magic Link email clicável em mobile → vai para app

#### Testes de Carga
- [ ] 100 logins OAuth simultâneos (staging) → sem erro 5xx
- [ ] audit_log com 1000 inserts/min → performance OK

---

## 🔍 Pontos Cegos Identificados na Revisão (15 itens)

Durante a revisão do plano, 15 pontos cegos foram encontrados. Todos têm mitigação documentada.

### 🔴 CRÍTICOS (quebrariam o plano se não corrigidos)

| # | Ponto Cego | Impacto | Mitigação |
|---|------------|---------|-----------|
| 1 | `account_type='trial'` no trigger pode ser sobrescrito por Edge Function | Convidados teriam `trial` em vez de `active` | Edge Function UPSERT é síncrono após `generate_link`. Documentar ordem. Trigger primeiro, Edge Function depois. |
| 2 | `signUp` no Register falha se email já existe | UX ruim para quem tenta se cadastrar com email já usado | Usar APENAS `signInWithOAuth` (faz ambos: signup OU login) |
| 3 | `feature flag` default `FALSE` esconde OAuth para novos trials OAuth | Trial que entrou com Google não vê botão Google no próximo login | Migration 065 define `enable_oauth = TRUE` por padrão |
| 4 | SetPassword é acessado ANTES do user estar autenticado | `getUser()` retorna null, detecção OAuth falha | Detectar via `getSession()` primeiro; se não houver sessão, fluxo antigo continua |
| 5 | Google OAuth em produção exige **verificação de domínio** | Pode bloquear rollout por 4-6 semanas | Iniciar verificação IMEDIATAMENTE na FASE 0 (paralelo ao dev) |
| 6 | CSP pode bloquear popups OAuth | Login falha silenciosamente | Adicionar `accounts.google.com` e `login.microsoftonline.com` no CSP (FASE 0) |
| 7 | Microsoft NÃO expõe avatar público via OAuth | Avatar sync falha para Microsoft | Não sincronizar avatar Microsoft. User usa upload manual. |
| 8 | `app_metadata.provider` reflete APENAS o último provider | User com senha+Google aparece como "google" após logar com Google | Usar `user.identities[].provider` que reflete TODOS os métodos |

### 🟡 IMPORTANTES (UX ou robustez)

| # | Ponto Cego | Impacto | Mitigação |
|---|------------|---------|-----------|
| 9 | Magic Link para OAuth user com email DIFERENTE | Cria identidade conflitante | Desabilitar Magic Link se user já logado (esconder botão). No fluxo de login, aceitar normalmente. |
| 10 | Anti-takeover com 2 logins é UX ruim | User abandona o fluxo | Simplificar: logar + banner persistente + features limitadas até confirmar |
| 11 | Magic Link não tem "reenviar" | Email pode cair no spam | Botão "Reenviar" com cooldown 60s |
| 12 | `mfa_secret_encrypted` no schema duplica storage | Supabase MFA já tem tabela própria | Remover coluna. Usar apenas `mfa_enabled` (UI flag, derivado de `auth.mfa_factors` count) |
| 13 | LGPD: audit_log armazena IP/User-Agent por tempo indeterminado | Viola privacidade | Job de purge após 365 dias (criar migration adicional ou cron) |

### 🟢 MELHORIAS (nice-to-have, não-bloqueantes)

| # | Ponto Cego | Impacto | Mitigação |
|---|------------|---------|-----------|
| 14 | Open Redirect: `redirectTo` malicioso | Atacante redireciona para site falso | Validar `redirectTo` contra whitelist: apenas origem atual + `/auth/callback` |
| 15 | Magic Link sem rate limit UI | User pode spammar o botão | Cooldown 60s no botão. Supabase tem rate limit built-in (~4/hora). |

---

## ⚠️ Riscos Residuais (depois das mitigações)

| # | Risco Residual | Por que não foi totalmente eliminado |
|---|----------------|--------------------------------------|
| 1 | Verificação Google pode falhar/ser negada | Dependência externa. Workaround: usar contas Google pessoais. |
| 2 | Magic Link em outro dispositivo | Por design — link funciona em qualquer browser. User pode revogar sessão em `/configuracoes`. |
| 3 | User com 2 contas Google | Popup do Google mostra seletor. UX padrão. |
| 4 | audit_log retention vs LGPD | Requer job de purge ativo. Se job falhar, dados permanecem. Monitorar. |

---

## Arquivos a Tocar/Criar

### Código (criar 8, editar 7)

**Criar (8)**:
- `src/pages/auth/AuthCallback.tsx`
- `src/pages/auth/MagicLinkSent.tsx`
- `src/pages/settings/SecurityPanel.tsx`
- `src/common/components/OAuthButtons.tsx`
- `src/core/services/auth/oauthProvider.ts`
- `src/core/services/auth/magicLinkProvider.ts`
- `src/core/services/auth/accountLinking.ts`
- `supabase/functions/magic-link-email/index.ts`
- `supabase/functions/oauth-confirmation-email/index.ts`

**Editar (7)**:
- `src/pages/auth/Login.tsx`
- `src/pages/auth/Register.tsx`
- `src/pages/auth/SetPassword.tsx`
- `src/pages/settings/Configuracoes.tsx`
- `src/core/contexts/UserContext.tsx`
- `src/App.tsx` (nova rota `/auth/callback`)
- `supabase/functions/send-invite-email/index.ts`

### Migrations (4)
- `064_fix_trial_role_default.sql`
- `065_org_feature_flags.sql`
- `066_oauth_anti_takeover.sql`
- `067_auth_audit_log.sql`

### Spec (1 diretório)
- `specs/auth-evolution/` com `plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`, `tasks.md`

---

## Estimativa de Tempo (revisada após identificar pontos cegos)

| Fase | Tempo | Features | Δ vs versão anterior |
|---|---|---|---|
| 0. Preparação | **1 dia** | Providers + CSP + verificação Google | +0.5 dia (CSP + verificação domínio) |
| 1. Banco de Dados | 2 dias | 4 migrations + backfill | — |
| 2. Edge Functions | 2 dias | Update + 2 novas | — |
| 3. Frontend Auth | **4 dias** | Componentes + banner + reenviar | +1 dia (anti-takeover simplificado) |
| 4. Account Linking | 2 dias | Vincular/desvincular | — |
| 5. UserContext + Avatar | 1 dia | Atualizar contexto + Microsoft skip | — |
| 6. QA + Edge Cases | **3-4 dias** | 30+ testes (regressão + novos + segurança + mobile + carga) | +1 dia (cenários extras) |
| **Total** | **15-17 dias úteis (≈ 3.5 semanas)** | | +2-3 dias |

---

## Métricas de Sucesso

| Métrica | Meta |
|---|---|
| Taxa de conversão trial (manual → Google) | +30% |
| Tempo médio de cadastro | Reduzir 40% |
| Tickets de "esqueci senha" | Reduzir 50% |
| NPS de novos usuários | +10 pontos |
| Bugs de regressão | 0 |
| Vulnerabilidades de segurança | 0 (anti-takeover bloqueia cenário) |

---

## Riscos e Trade-offs

| # | Risco | Mitigação |
|---|-------|-----------|
| 1 | Mudança no trigger afeta trial user existente se ele logar após migration | `CREATE OR REPLACE FUNCTION` afeta só novos signups. Profiles existentes não são tocados. |
| 2 | Convite existente pode quebrar se Edge Function não for atualizada | Edge Function continua igual, mas adiciona `invited_email`. Não muda fluxo. |
| 3 | OAuth provider (Google/Microsoft) fora do ar | Fallback: email/senha continua funcionando. Magic Link idem. |
| 4 | User recusa confirmação por email (anti-takeover) | Profile fica em `pending_oauth_confirmation = true`. Após 7 dias, desativar. |
| 5 | Magic Link interceptado | Validade 24h + RLS protege dados sensíveis. |
| 6 | RLS policies não antecipam OAuth user_id | RLS usa `auth.uid()` que é estável para qualquer auth method. Sem impacto. |
| 7 | Performance: tabela `auth_audit_log` cresce rápido | Índices por `user_id` e `created_at`. Política de retenção: 1 ano. |
| 8 | Custo: Google Cloud + Azure são grátis para OAuth | $0. Supabase Free tier: 50k MAU. Sem custo até escalar. |

---

## Critérios de Não-Regressão (Definition of Done)

- [ ] Todas as migrations aplicadas em produção
- [ ] Edge Functions deployed
- [ ] Providers ativados no Supabase Dashboard
- [ ] Variáveis de ambiente configuradas
- [ ] Todos os testes manuais passaram (login, convite, trial, OAuth, magic link, account linking, anti-takeover)
- [ ] Documentação atualizada (README + AGENTS.md)
- [ ] Nenhuma regressão em produção
- [ ] Audit log registrando todos os logins
- [ ] Feature flag funcionando (org pode togglar OAuth)

---

## Próximos Passos (após aprovação)

1. **Sair do plan mode** (já feito)
2. **Executar FASE 0** (providers OAuth)
3. **Aplicar migrations em staging primeiro**
4. **QA em staging** com 1 org piloto
5. **Rollout gradual** via feature flag
6. **Monitorar audit log** por 7 dias
7. **Habilitar para todas as orgs**

---

## Fase Futura: MFA TOTP

Quando for implementar MFA (próximo plano):

- TOTP enrollment em `/configuracoes → Segurança`
- Obrigatório para `user_role IN ('owner', 'administrador', 'supervisor')`
- Recuperação via email com link único (24h)
- Backup codes (8 únicos) ao ativar
- Bloquear login sem MFA para roles obrigatórios
- **NÃO** precisa adicionar colunas — `mfa_enabled` já existe e Supabase MFA API gerencia o resto
- Usar `supabase.auth.mfa.enroll({ factorType: 'totp' })`
- Verificar `await supabase.auth.mfa.listFactors()` na próxima sessão

---

## Referências

- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase OAuth: https://supabase.com/docs/guides/auth/social-login
- Magic Link: https://supabase.com/docs/guides/auth/auth-magic-link
- Google Cloud Console: https://console.cloud.google.com/
- Azure App Registrations: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps

---

**⚠️ IMPORTANTE**: Este documento é apenas um **plano**. Nada foi implementado ainda.
Aguardando confirmação do time antes de iniciar a FASE 0.
