# Plano de Implantação: Segurança e Anti-Spam

**Data:** 2026-06-17 | **Base:** `docs/security/SECURITY_BACKLOG.md` | **Status:** Rascunho

## Sumário

Implementação progressiva de proteções anti-spam e correções de segurança no app Usabit people, priorizando maior impacto com menor risco de quebra.

## Estrutura de Fases

```
Fase 0 — Configuração Inicial (Supabase + Cloudflare)
Fase 1 — Rate Limit no Supabase Auth
Fase 2 — Cloudflare Turnstile (Registro + Login)
Fase 3 — Endurecer openai-proxy (JWT validation + rate limit)
Fase 4 — Turnstile + Rate Limit nos Formulários Públicos
Fase 5 — Proteger Edge Functions de Email (DEPENDE DA FASE 4)
Fase 6 — Honeypot + Validação de Domínio de Email
Fase 7 — Monitoramento e Alertas
```

## ⚠️ Dependências Críticas Entre Fases

```
F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7
                         ↑       ↑
                    F4.1/F4.3   F5.1 (send-application-email precisa do
                    (submit-    applicationId retornado pela nova EF
                    candidate   submit-application criada na F4.2)
                    e submit-
                    application
                    criadas)
```

**Explicação:** A Fase 4 (proteger formulários públicos) cria as Edge Functions `submit-candidate` e `submit-application` que retornam os IDs dos registros. A Fase 5 (proteger EFs de email) precisa desses IDs para buscar dados no banco em vez de aceitar dados crus do client. **Não executar F5 antes de F4.**

## Arquivos Impactados (Visão Geral)

| Arquivo | Fase | Tipo de Alteração |
|---------|------|-------------------|
| `src/pages/auth/Register.tsx` | F2, F6 | Adicionar Turnstile + Honeypot + disposable check |
| `src/pages/auth/Login.tsx` | F2 | Adicionar Turnstile |
| `supabase/functions/openai-proxy/index.ts` | F3 | JWT validation + rate limit (+ secret `SUPABASE_ANON_KEY`) |
| `src/core/services/ai/client.ts` | F3 | Nenhuma (já envia JWT) |
| `supabase/functions/submit-candidate/index.ts` | F4 | Validar Turnstile token + rate limit |
| `supabase/functions/submit-application/index.ts` | F4 | **NOVA** Edge Function (substitui insert direto) |
| `src/pages/vagas/SpontaneousApplication.tsx` | F4, F6 | Adicionar Turnstile + Honeypot |
| `src/pages/vagas/JobApplication.tsx` | F4, F6 | Adicionar Turnstile + Honeypot + migrar para EF |
| `src/features/candidates/components/PoolAddCandidate.tsx` | F4 | Adicionar Turnstile |
| `supabase/functions/send-application-email/index.ts` | F5 | Receber applicationId, validar existência, rate limit |
| `supabase/functions/send-spontaneous-email/index.ts` | F5 | Receber candidateId, validar existência, rate limit |
| `supabase/functions/send-invite-email/index.ts` | F5 | Validar JWT + permissão do caller (+ secret `SUPABASE_ANON_KEY`) |
| `.env.local` | F0 | Adicionar `VITE_TURNSTILE_SITE_KEY` |
| `supabase/migrations/XXX_create_rate_limits.sql` | F3, F4, F5 | **NOVA** migration para tabela de rate limits |
| `docs/security/SECURITY_BACKLOG.md` | - | Atualizar status dos itens |

---

## Fase 0 — Configuração Inicial (15 min)

### Pré-requisitos

- [ ] Conta Cloudflare com Turnstile acessível
- [ ] Acesso ao Dashboard do Supabase (role `owner` ou `admin`)
- [ ] `supabase` CLI instalado e logado

### Passo 0.1 — Criar Turnstile Widget no Cloudflare

1. Acessar [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile
2. Criar novo widget:
   - **Nome:** `Usabit People - Auth`
   - **Domínios:** `spacetalent.com.br`, `usabit.github.io`, `localhost` (sem porta — Turnstile ignora porta, apenas hostname)
   - **Widget Mode:** **Invisible** (melhor UX) ou **Managed** (fallback)
3. Anotar **Site Key** e **Secret Key**

### Passo 0.2 — Configurar Chaves no Projeto

```bash
# Frontend ( .env.local )
echo "VITE_TURNSTILE_SITE_KEY=0x4AAAA..." >> .env.local

# Supabase Secrets (para Edge Functions validarem)
npx supabase secrets set TURNSTILE_SECRET_KEY=0x3AAAA...
```

### Passo 0.3 — Ativar CAPTCHA no Supabase Auth

1. Dashboard Supabase → **Authentication** → **Providers**
2. Aba **Settings** → **Security** → **CAPTCHA protection**
3. Colar `TURNSTILE_SECRET_KEY` no campo apropriado
4. Ativar toggle

### Verificação Fase 0

```bash
npx supabase secrets list | findstr TURNSTILE
# Deve mostrar TURNSTILE_SECRET_KEY configurado
```

---

## Fase 1 — Rate Limit no Supabase Auth (10 min)

**Configuração** (Dashboard Supabase, sem código):

### Passo 1.1 — Configurar limites de Auth

| Endpoint | Limite | Janela | Comportamento |
|----------|--------|--------|---------------|
| `signup` | 5 | 1 hora | Bloqueia após 5 cadastros/IP/hora |
| `signin` | 10 | 1 minuto | Bloqueia após 10 tentativas/IP/min |
| `password-reset` | 3 | 1 hora | Bloqueia após 3 solicitações/IP/hora |
| `verify-otp` | 5 | 1 hora | Bloqueia após 5 tentativas/IP/hora |

Dashboard Supabase → **Authentication** → **Policies** → **Rate Limits** → Configurar valores acima.

### Verificação Fase 1

- Tentar criar conta 6x com emails diferentes do mesmo IP → 6ª deve falhar com `429 Too Many Requests`

---

## Fase 2 — Cloudflare Turnstile no Registro + Login (1h)

### Passo 2.1 — Instalar pacote Turnstile

```bash
npm install @marsidev/react-turnstile
```

> **Nota:** Se houver conflito de versão, usar o script CDN diretamente (alternativa documentada no final).

### Passo 2.2 — Adicionar Turnstile ao `Register.tsx`

**Arquivo:** `src/pages/auth/Register.tsx`

**Alterações:**

1. **Import** (topo do arquivo):
   ```ts
   import Turnstile from '@marsidev/react-turnstile'
   ```

2. **Estado** (junto com os outros `useState`):
   ```ts
   const [captchaToken, setCaptchaToken] = useState<string | null>(null)
   ```

3. **JSX** — Adicionar o widget Turnstile entre o último input e o botão "CRIAR CONTA" (~L156):
   ```tsx
   <Turnstile
     siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
     onSuccess={(token) => setCaptchaToken(token)}
     onError={() => setCaptchaToken(null)}
     options={{
       theme: 'dark',
       size: 'invisible',
     }}
   />
   ```

4. **Validação no submit** (`handleRegister`, ~L35):
   ```ts
   if (!captchaToken) {
     setMessage({ type: 'error', text: 'Verificação de segurança falhou. Recarregue e tente novamente.' })
     setLoading(false)
     return
   }
   ```

5. **Passar captchaToken no signUp** (~L38):
   ```ts
   const { error } = await supabase.auth.signUp({
     email,
     password,
     options: {
       data: { full_name: name, name, organization_name: '' },
       emailRedirectTo: ...,
       captchaToken, // <-- adicionar esta linha
     }
   })
   ```

**Não mexer:** Layout, estilos, outros imports, outras funções.

### Passo 2.3 — Adicionar Turnstile ao `Login.tsx`

**Arquivo:** `src/pages/auth/Login.tsx`

**Alterações** (mesmo padrão do Register):

1. Import `Turnstile` + estado `captchaToken`
2. Adicionar `<Turnstile>` entre último input e botão "ENTRAR"
3. Validar `captchaToken` antes de chamar `signInWithPassword`
4. Passar `captchaToken` no `options`:

   ```ts
   const { error } = await supabase.auth.signInWithPassword({
     email,
     password,
     options: { captchaToken },
   })
   ```

### Verificação Fase 2

```bash
npm run lint     # Zero erros
npm run build    # Build sem falhas
npx tsc --noEmit # Zero erros de tipo
```

**Teste manual:** Abrir `/registro` → verificar widget Turnstile aparece (modo invisível = sem alteração visual, mas token é gerado). Tentar submit sem passar pelo Turnstile → deve falhar.

---

## Fase 3 — Endurecer openai-proxy (1h)

### Problema

O proxy atualmente valida apenas o header `Origin` (spoofável). Qualquer pessoa que consiga forjar um origin permitido pode usar seus créditos OpenAI.

**Arquivo:** `supabase/functions/openai-proxy/index.ts`

### Passo 3.1 — Adicionar validação de JWT

Importar `createClient` no topo:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
```

Adicionar constantes (substituir uso de `Deno.env.get` existente):

```ts
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
```

No handler, **antes** de processar o body (`const { messages, ... } = await req.json()`):

```ts
// Validar JWT do usuário
const authHeader = req.headers.get('Authorization') || ''
const token = authHeader.replace('Bearer ', '')

if (!token) {
  return new Response(JSON.stringify({ error: 'Token não fornecido' }), {
    status: 401, headers: { 'Content-Type': 'application/json' }
  })
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const { data: { user }, error } = await supabase.auth.getUser(token)
if (error || !user) {
  return new Response(JSON.stringify({ error: 'Token inválido' }), {
    status: 401, headers: { 'Content-Type': 'application/json' }
  })
}

// Opcional: verificar role do usuário (apenas rh/gestor/owner)
const { data: profile } = await supabase
  .from('profiles')
  .select('user_role')
  .eq('id', user.id)
  .single()

if (!profile || !['rh', 'gestor', 'owner'].includes(profile.user_role)) {
  return new Response(JSON.stringify({ error: 'Permissão insuficiente' }), {
    status: 403, headers: { 'Content-Type': 'application/json' }
  })
}
```

### Passo 3.2 — Adicionar rate limit por usuário

Usar tabela `rate_limits` no PostgreSQL (criar migration antes):

```sql
-- Migration: supabase/migrations/XXX_create_rate_limits.sql
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON rate_limits(key, endpoint, window_start);
```

Na Edge Function, usar uma função auxiliar:

```ts
async function checkRateLimit(supabase: any, key: string, endpoint: string, maxRequests: number, windowMs: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs).toISOString()
  
  // Limpar entradas antigas (uma vez a cada chamada, leve)
  await supabase.from('rate_limits').delete().lt('window_start', windowStart)
  
  // Buscar contagem atual
  const { count } = await supabase
    .from('rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('key', key)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart)
  
  if (count >= maxRequests) return false
  
  // Registrar requisição
  await supabase.from('rate_limits').insert({ key, endpoint })
  return true
}
```

Usar: `checkRateLimit(supabase, `user:${user.id}`, 'openai-proxy', 60, 60000)`

### Passo 3.3 — Remover validação de Origin

Remover o bloco `ALLOWED_ORIGINS` e a validação de origin. Agora o JWT é a barreira de segurança.

**Manter:** O CORS com `Access-Control-Allow-Origin: *` (já que o JWT protege).

### Passo 3.4 — Configurar secrets necessários

```bash
npx supabase secrets set SUPABASE_ANON_KEY=<chave_anon_do_projeto>
```

> **⚠️ Atenção:** `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetados automaticamente pelo Supabase nas Edge Functions. `SUPABASE_ANON_KEY` NÃO é — precisa ser setado manualmente.

### Passo 3.5 — Aplicar migration da tabela rate_limits

```bash
npx supabase migration new create_rate_limits
# Colar o SQL acima no arquivo gerado
npx supabase db push
```

### Verificação Fase 3

```bash
npx supabase functions serve openai-proxy --no-verify-jwt
# Testar sem token → 401
# Testar com token inválido → 401
# Testar com token de role 'convidado' → 403
# Testar com token de role 'rh' → 200
```

---

## Fase 4 — Turnstile + Rate Limit nos Formulários Públicos (2h30)

### Passo 4.1 — `submit-candidate` (SpontaneousApplication)

**Arquivo:** `supabase/functions/submit-candidate/index.ts`

**Alterações:**

1. Adicionar `turnstileToken: string` ao body esperado
2. Validar token contra Cloudflare:
   ```ts
   const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY')
   if (!turnstileSecret) {
     return new Response(JSON.stringify({ error: 'Turnstile não configurado' }), { status: 500 })
   }
   const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ secret: turnstileSecret, response: body.turnstileToken }),
   })
   const verifyData = await verifyRes.json()
   if (!verifyData.success) {
     return new Response(JSON.stringify({ error: 'Verificação de segurança falhou' }), { status: 403 })
   }
   ```
3. Adicionar rate limit por IP usando tabela `rate_limits`:
   ```ts
   const clientIp = req.headers.get('x-forwarded-for') || 'unknown'
   const allowed = await checkRateLimit(supabaseAdmin, `ip:${clientIp}`, 'submit-candidate', 10, 60000)
   if (!allowed) {
     return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente mais tarde.' }), { status: 429 })
   }
   ```

### Passo 4.2 — Criar Edge Function `submit-application` (JobApplication)

**Arquivo:** `supabase/functions/submit-application/index.ts` (NOVO)

**Motivação:** Hoje `JobApplication.tsx` insere direto em `vagas_candidaturas` via RLS público (`WITH CHECK (true)`). Precisamos mover para uma Edge Function que valide Turnstile + rate limit.

**Estrutura:**

1. Importar `createClient` com `SUPABASE_SERVICE_ROLE_KEY`
2. Validar Turnstile token
3. Validar que a vaga existe, está ativa (`status = 'aberta'`) e aceita candidaturas
4. Fazer upload do PDF (validando extensão `.pdf` e tamanho ≤ 10MB)
5. Inserir em `vagas_candidaturas` via `supabaseAdmin` (service role)
6. Retornar `applicationId` no response
7. Rate limit por IP (10 req/min)

**Headers CORS:** Usar `*` para origin (vem de domínios diferentes por org).

### Passo 4.3 — Adicionar Turnstile ao `SpontaneousApplication.tsx`

**Arquivo:** `src/pages/vagas/SpontaneousApplication.tsx`

1. Importar `Turnstile` de `@marsidev/react-turnstile`
2. Adicionar estado `captchaToken`
3. Renderizar `<Turnstile>` no step 2 (antes do botão submit)
4. Validar `captchaToken` antes do submit:
   ```ts
   if (!captchaToken) {
     toast.error('Verificação de segurança necessária.')
     return
   }
   ```
5. Passar `turnstileToken` no body do fetch para `submit-candidate`

### Passo 4.4 — Adicionar Turnstile ao `JobApplication.tsx` + migrar insert

**Arquivo:** `src/pages/vagas/JobApplication.tsx`

**Alterações:**

1. Importar `Turnstile` + estado `captchaToken`
2. Renderizar `<Turnstile>` antes do botão de submit
3. **Substituir** o `supabase.from('vagas_candidaturas').insert(...)` por chamada a `submit-application` EF:

   ```ts
   const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-application`, {
     method: 'POST',
     headers: {
       'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       vaga_id: job!.id,
       organization_id: job!.organization_id,
       formData: { name: formData.name, email: formData.email, ... },
       resumeFile: resumeFile, // ou upload separado
       turnstileToken: captchaToken
     })
   })
   const result = await res.json()
   const applicationId = result.id
   ```

4. **Manter:** O código de análise de IA (jobAnalyzer) — ele roda depois do insert
5. Atualizar chamada a `send-application-email` para passar `applicationId`

### Passo 4.5 — Adicionar Turnstile ao `PoolAddCandidate.tsx` (se existir)

**Arquivo:** `src/features/candidates/components/PoolAddCandidate.tsx`

1. Importar `Turnstile` + estado `captchaToken`
2. Renderizar `<Turnstile>` no modal antes do botão "Confirmar"
3. Passar `turnstileToken` no insert (ou validar no frontend + backend)

> **Nota:** Este fluxo é interno (usuário autenticado), mas Turnstile adiciona camada extra contra bots que possam ter comprometido credenciais.

### ⚠️ Atenção: Migração do RLS Público

Após deploy da `submit-application` EF e confirmação de que o frontend não usa mais insert direto:

```sql
-- Migration futura: remover policy pública
DROP POLICY IF EXISTS "candidaturas: public insert" ON vagas_candidaturas;
```

**Não fazer isso antes de confirmar que todo o tráfego passa pela EF.**

### Verificação Fase 4

```bash
npm run lint
npm run build
npx tsc --noEmit
npx supabase functions serve submit-candidate
npx supabase functions serve submit-application
```

Testar envio de candidatura sem Turnstile → 403. Com Turnstile válido → 200.

---

---

## Fase 5 — Proteger Edge Functions de Email (1h30)

### ⚠️ Pré-requisito

**Esta fase DEPENDE da Fase 4.** As Edge Functions de email precisam receber IDs retornados pelas novas EFs `submit-candidate` e `submit-application`. Executar antes da Fase 4 quebrará o fluxo de email.

### Passo 5.1 — `send-application-email`

**Arquivo:** `supabase/functions/send-application-email/index.ts`

**Problema:** Aceita `candidateEmail`, `candidateName`, `jobTitle` do client — pode ser usado para spam arbitrário via sua conta Resend.

**Alterações:**

1. Mudar input para receber apenas `applicationId: string`
2. Criar client Supabase com `SUPABASE_SERVICE_ROLE_KEY`
3. Buscar a candidatura na tabela `vagas_candidaturas`:
   ```ts
   const supabaseAdmin = createClient(
     Deno.env.get('SUPABASE_URL')!,
     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
   )

   const { data: application } = await supabaseAdmin
     .from('vagas_candidaturas')
     .select('candidate_email, candidate_name, vaga_id')
     .eq('id', applicationId)
     .single()

   if (!application) {
     return new Response(JSON.stringify({ error: 'Candidatura não encontrada' }), { status: 404 })
   }
   ```
4. Buscar o título da vaga:
   ```ts
   const { data: vaga } = await supabaseAdmin
     .from('vagas_white_label')
     .select('title')
     .eq('id', application.vaga_id)
     .single()
   ```
5. Usar `application.candidate_email`, `application.candidate_name` e `vaga.title` no email (em vez dos valores crus do client)
6. Adicionar rate limit (ex: máx 10 emails/min por IP, reusar `checkRateLimit`)

**Frontend (`JobApplication.tsx`):**

Antes (envia dados crus):
```ts
await supabase.functions.invoke('send-application-email', {
  body: { candidateName: formData.name, candidateEmail: formData.email, jobTitle: job!.title }
})
```

Depois (envia apenas o ID):
```ts
// applicationId veio do retorno da submit-application EF
await supabase.functions.invoke('send-application-email', {
  body: { applicationId }
})
```

### Passo 5.2 — `send-spontaneous-email`

**Arquivo:** `supabase/functions/send-spontaneous-email/index.ts`

**Mesmo padrão do 5.1:**

1. Receber `candidateId: string` em vez de `candidateName` + `candidateEmail`
2. Buscar dados na tabela `candidates`:
   ```ts
   const { data: candidate } = await supabaseAdmin
     .from('candidates')
     .select('name, email, organization_id')
     .eq('id', candidateId)
     .single()
   ```
3. Rate limit (10 req/min por IP)

**Frontend (`SpontaneousApplication.tsx`):**

Antes:
```ts
await supabase.functions.invoke('send-spontaneous-email', {
  body: { candidateName: formData.name, candidateEmail: formData.email, orgName }
})
```

Depois:
```ts
// result.id veio do retorno da submit-candidate EF
await supabase.functions.invoke('send-spontaneous-email', {
  body: { candidateId: result.id }
})
```

### Passo 5.3 — `send-invite-email`

**Arquivo:** `supabase/functions/send-invite-email/index.ts`

**Problema:** Usa `SUPABASE_SERVICE_ROLE_KEY` para tudo, sem validar quem chamou.

**Alterações:**

1. Adicionar validação de JWT no início:
   ```ts
   const authHeader = req.headers.get('Authorization') || ''
   const token = authHeader.replace('Bearer ', '')

   const supabase = createClient(
     Deno.env.get('SUPABASE_URL')!,
     Deno.env.get('SUPABASE_ANON_KEY')!
   )
   const { data: { user }, error } = await supabase.auth.getUser(token)
   if (error || !user) {
     return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 })
   }
   ```
2. Buscar perfil e verificar permissão:
   ```ts
   const { data: profile } = await supabaseAdmin
     .from('profiles')
     .select('user_role, organization_id')
     .eq('id', user.id)
     .single()

   const hierarchy = { owner: 4, gestor: 3, rh: 2, convidado: 1 }
   const callerLevel = hierarchy[profile.user_role as keyof typeof hierarchy] || 0
   const targetLevel = hierarchy[role as keyof typeof hierarchy] || 0

   if (targetLevel >= callerLevel && profile.user_role !== 'owner') {
     return new Response(
       JSON.stringify({ error: 'Permissão insuficiente para atribuir esta role' }),
       { status: 403 }
     )
   }
   ```
3. Configurar secret `SUPABASE_ANON_KEY` se não existir:
   ```bash
   npx supabase secrets set SUPABASE_ANON_KEY=<chave_anon>
   ```

### Verificação Fase 5

```bash
npx supabase functions serve send-application-email
npx supabase functions serve send-spontaneous-email
npx supabase functions serve send-invite-email
```

Testar:
- `send-application-email` com ID inválido → 404
- `send-spontaneous-email` com ID inválido → 404
- `send-invite-email` sem token → 401, com token de `convidado` → 403, com token de `owner` → 200

---

## Fase 6 — Honeypot + Validação de Domínio de Email (1h)

### Passo 6.1 — Honeypot nos formulários públicos

**O que é:** Campo de input oculto (display:none) que apenas bots preenchem. Se vier preenchido, rejeita.

**Arquivos:** `Register.tsx`, `SpontaneousApplication.tsx`, `JobApplication.tsx`

**Adicionar em cada formulário:**

```tsx
// Estado (invisível para o usuário)
const [honeypot, setHoneypot] = useState('')

// JSX (em qualquer lugar do form, sem display)
<input
  type="text"
  name="website"
  tabIndex={-1}
  autoComplete="off"
  style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
  value={honeypot}
  onChange={e => setHoneypot(e.target.value)}
/>

// Validação no submit
if (honeypot) {
  // Bot preencheu o campo invisível
  setMessage({ type: 'error', text: 'Erro de validação.' })
  return
}
```

### Passo 6.2 — Validar domínio de email no registro

**Arquivo:** `src/pages/auth/Register.tsx`

Adicionar verificação de domínios descartáveis no `handleRegister`:

```ts
const disposableDomains = [
  'mailinator.com', 'guerrillamail.com', 'tempmail.com',
  '10minutemail.com', 'throwaway.email', 'yopmail.com',
  'mailnator.com', 'temp-mail.org', 'fakeinbox.com',
  // ...lista completa em uma constante externa
]

const emailDomain = email.split('@')[1]?.toLowerCase()
if (disposableDomains.includes(emailDomain)) {
  setMessage({ type: 'error', text: 'E-mails temporários não são permitidos. Use um e-mail corporativo ou pessoal.' })
  setLoading(false)
  return
}
```

> **Alternativa:** Usar uma API como `https://disify.com/` ou `https://open.kickbox.com/` para verificação em tempo real. Mais preciso, mas adiciona dependência externa.

### Verificação Fase 6

```bash
npm run lint && npm run build && npx tsc --noEmit
```

---

## Fase 7 — Monitoramento e Alertas (30 min)

### Passo 7.1 — Logs de segurança no Supabase

Ativar logs de auditoria no Dashboard Supabase:
- **Database** → **Logs** → Verificar logs de erro de auth (rate limit hits)
- **Edge Functions** → **Logs** → Monitorar 403/429

### Passo 7.2 — Alertas no Resend

No Dashboard Resend:
- Verificar métricas de envio (se houver pico,怀疑 spam)
- Configurar webhook de bounce/complaint (se disponível)

---

## Tabela de Verificações Obrigatórias (Checkpoint por Fase)

| Fase | O que Verificar | Comando / Método | Esperado |
|------|----------------|------------------|----------|
| F0 | Secrets do Supabase | `npx supabase secrets list | findstr TURNSTILE` | `TURNSTILE_SECRET_KEY` visível |
| F1 | Rate limits no Auth | Dashboard Supabase → Authentication → Policies | Limites configurados |
| F2 | Compilação + tipos | `npm run lint && npm run build && npx tsc --noEmit` | Zero erros |
| F2 | Turnstile no Registro | Abrir `/registro`, inspecionar network | Requisição ao Turnstile visível |
| F3 | Compilação + tipos | `npm run lint && npm run build && npx tsc --noEmit` | Zero erros |
| F3 | openai-proxy sem token | `curl -X POST ... openai-proxy` | 401 |
| F3 | openai-proxy com token rh | `curl -H "Authorization: Bearer <token_rh>" ...` | 200 |
| F3 | openai-proxy role convidado | `curl -H "Authorization: Bearer <token_convidado>" ...` | 403 |
| F4 | Compilação + tipos | `npm run lint && npm run build && npx tsc --noEmit` | Zero erros |
| F4 | submit sem captcha | Enviar candidatura sem turnstileToken | 403 |
| F4 | submit com captcha | Enviar candidatura com turnstileToken válido | 200 |
| F4 | submit-application | Enviar candidatura a vaga padrão | 200 + applicationId |
| F5 | send-application-email | Chamar com ID inválido | 404 |
| F5 | send-spontaneous-email | Chamar com ID inválido | 404 |
| F5 | send-invite-email | Chamar sem token | 401 |
| F5 | send-invite-email | Chamar com token de convidado | 403 |
| F6 | Compilação + tipos | `npm run lint && npm run build && npx tsc --noEmit` | Zero erros |
| F6 | Honeypot | Preencher campo oculto e submeter | Erro de validação |
| F6 | Disposable email | Registrar com email @mailinator.com | Bloqueado |
| F7 | Logs de erro | Dashboard Supabase → Edge Functions → Logs | 403/429 aparecendo |

---

## Anexo A — Fallback: Turnstile via CDN (sem dependência de pacote npm)

Se `@marsidev/react-turnstile` causar problemas de compatibilidade, usar o script direto:

```tsx
// Em vez de import Turnstile from '@marsidev/react-turnstile'
const TurnstileWidget = ({ onSuccess, onError }: { onSuccess: (token: string) => void; onError: () => void }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Carregar script do Turnstile
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    // Configurar callback global
    ;(window as any).turnstileCallback = (token: string) => onSuccess(token)

    return () => {
      document.head.removeChild(script)
      delete (window as any).turnstileCallback
    }
  }, [onSuccess, onError])

  return (
    <div
      ref={ref}
      className="cf-turnstile"
      data-sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
      data-callback="turnstileCallback"
      data-theme="dark"
    />
  )
}
```

---

## Anexo B — Recomendação: Content Security Policy (CSP)

Adicionar headers CSP no `index.html` ou via configuração do servidor (Netlify/Vercel):

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://challenges.cloudflare.com;
  frame-src https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co https://api.openai.com;
">
```

**Nota:** CSP é uma camada defensiva adicional. Não substitui Turnstile ou rate limiting.

---

## Anexo C — Plano de Rollback

Se uma fase causar problemas em produção:

| Fase | Rollback |
|------|----------|
| F0 | Remover `VITE_TURNSTILE_SITE_KEY` do .env, rebuildar. Remover `TURNSTILE_SECRET_KEY` dos secrets. Desativar CAPTCHA no Auth |
| F1 | Reduzir ou desativar rate limits no Dashboard |
| F2 | Reverter alterações nos arquivos `Register.tsx` e `Login.tsx` via `git checkout` |
| F3 | Reverter `openai-proxy/index.ts` para versão anterior. Remover `SUPABASE_ANON_KEY` dos secrets se não usado em outras EFs |
| F4 | Reverter alterações nas EFs `submit-candidate`, `submit-application` e nos arquivos `SpontaneousApplication.tsx`, `JobApplication.tsx`, `PoolAddCandidate.tsx`. Restaurar RLS pública até nova tentativa |
| F5 | Reverter alterações nas EFs `send-application-email`, `send-spontaneous-email`, `send-invite-email` |
| F6 | Reverter honeypot e disposable check nos arquivos |
| F7 | N/A (apenas monitoramento, sem mudança de código) |

**Sempre** testar rollback em staging antes de aplicar em produção.

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Turnstile quebrar em proxying/CORS | Baixa | Médio | Usar modo Managed (fallback para widget visível) |
| `@marsidev/react-turnstile` incompatível | Baixa | Alto | Fallback CDN (Anexo A) |
| Rate limit via PostgreSQL aumentar latência | Média | Baixo | `head: true` + índice cobre lookup |
| Mudança no insert do JobApplication quebrar fluxo | Média | Alto | Testar staging; rollback documentado (Anexo C) |
| OpenAI proxy JWT validation quebrar chamadas | Baixa | Alto | Ambos callers já enviam JWT — seguro ✅ |
| F5 executada antes da F4 (dependência não respeitada) | Média | Alto | Dependência documentada no topo da F5 |
| `SUPABASE_ANON_KEY` não setado nos secrets | Média | Alto | F3.4 documenta; verificar com `secrets list` |
| Token Turnstile expirar em formulário longo | Baixa | Baixo | Tokens válidos 5 min; regenerar no submit |

## Glossário

| Termo | Definição |
|-------|-----------|
| Turnstile | Serviço gratuito de CAPTCHA da Cloudflare (substituto do reCAPTCHA) |
| Honeypot | Campo HTML oculto que bots preenchem, humanos não |
| Rate Limit | Limitação de requisições em uma janela de tempo |
| JWT | JSON Web Token — token de autenticação do Supabase |
| Cold Start | Quando uma Edge Function serverless "acorda" do zero (sem estado em memória) |
| Service Role Key | Chave do Supabase que bypassa RLS (uso exclusivo em servidor) |

---

## Histórico

| Data | Versão | Autor | Alteração |
|------|--------|-------|-----------|
| 2026-06-17 | 0.1 | Fabrycio | Criação inicial do plano |
