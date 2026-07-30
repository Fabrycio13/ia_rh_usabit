# Decisões do IA RH

> Toda decisão aponta para código/migrations/testes atuais. Verificar `Evidence` antes de aplicar.

---

## DEC-2026-07-30-001 — Fluxo de convite preserva perfis `pending`

- **Status:** accepted
- **Domains:** auth, security
- **Keywords:** invite, SetPassword, pending, active, get_my_role
- **Decision:** Usuários com `status = 'pending'` devem conseguir concluir o cadastro via `SetPassword.tsx`. Apenas `inactive` é bloqueado.
- **Rationale:** `pending` precisa manter o mínimo de acesso (RLS `profiles: own`) para gravar a senha e atualizar o perfil para `active`. Bloquear `pending` em `get_my_role()` quebraria o fluxo de invite.
- **Evidence:**
  - `src/pages/auth/SetPassword.tsx` (178 linhas)
  - `supabase/migrations/086_get_my_role_status_check.sql`
- **Supersedes:** none
- **Verified:** 2026-07-30

---

## DEC-2026-07-30-002 — `get_my_role()` retorna NULL apenas para `inactive`

- **Status:** accepted
- **Domains:** auth, security, rls
- **Keywords:** inactive, RLS policy, role blocking, status check
- **Decision:** Função `get_my_role()` retorna `NULL` se `profiles.status = 'inactive'`. Em todos os outros casos retorna `COALESCE(user_role, 'owner')`.
- **Rationale:** Policies RLS que usam `get_my_role() IS NOT NULL` filtram automaticamente perfis inativos, sem alterar uma policy por uma. Mantém `pending` funcional. Implementação na migration 086 via `CASE WHEN status = 'inactive'`.
- **Evidence:**
  - `supabase/migrations/086_get_my_role_status_check.sql`
  - Commit `4acc073 feat(security): H-07 item 2`
- **Supersedes:** none
- **Verified:** 2026-07-30

---

## DEC-2026-07-30-003 — Edge Functions bloqueiam perfis inativos/pending em rotas autenticadas

- **Status:** accepted
- **Domains:** security, ia, upload, auth
- **Keywords:** status check, edge function, inactive, pending
- **Decision:** EFs internas (`openai-proxy`, `enrich-candidate`, `get-upload-url`) verificam `profile.status` e retornam erro 403 quando diferente de `active`. O fluxo público de upload permanece aberto.
- **Rationale:** Bloqueio server-side complementa o `get_my_role()`. Defesa em camadas: RLS + Edge Function. Não depende apenas do frontend.
- **Evidence:**
  - `supabase/functions/openai-proxy/index.ts`
  - `supabase/functions/enrich-candidate/index.ts`
  - `supabase/functions/get-upload-url/index.ts`
  - Commit `5f19cd8 feat(security): H-07 status check — EFs bloqueiam se status != active`
- **Supersedes:** none
- **Verified:** 2026-07-30

---

## DEC-2026-07-30-004 — Proxy de IA aceita apenas formato `type + data`

- **Status:** accepted
- **Domains:** ia, security
- **Keywords:** openai-proxy, messages, type, data, prompt injection
- **Decision:** O endpoint `openai-proxy` aceita somente requests com `{ type, data }`. Qualquer outro formato (incluindo o legado `messages` cru) é rejeitado com 400.
- **Rationale:** Evita que o cliente envie prompts arbitrários e bypass guardrails/prompts montados no servidor. Os prompts são construídos server-side via `buildScoringMessages`, `buildJobMatchingMessages`, `buildExtractionMessages`, `buildResumeMessages`, etc.
- **Implementation detail:** o tipo da `body` ainda mantém o campo `messages?` apenas por compatibilidade de tipos TS; em runtime a função nunca o processa diretamente — só o que está dentro de `data.messages` em `type: 'chat'`. Toda request sem `type && data` retorna `400 — formato antigo removido`.
- **Evidence:**
  - `supabase/functions/openai-proxy/index.ts` linhas 103-110, 119-223
  - Commit `d4ff0ce feat(security): H-06 limit IA`
- **Supersedes:** none
- **Verified:** 2026-07-30

---

## DEC-2026-07-30-005 — Allowlist server-side de modelos de IA e timeout

- **Status:** accepted
- **Domains:** ia, security
- **Keywords:** ALLOWED_MODELS, gpt-4o, timeout, AbortSignal
- **Decision:** O proxy aceita somente os modelos `gpt-4o` e `gpt-4o-mini`. Modelo fora da lista cai no default do `type`. Todos os `fetch` para OpenAI e Zen têm `AbortSignal.timeout(30_000)`.
- **Rationale:** Defesa server-side contra escalonamento de custo via modelos mais caros. Timeout evita Edge Function pendurada se o provider de IA cair.
- **Evidence:**
  - `supabase/functions/openai-proxy/index.ts` linhas 51, 227, 245, 270
  - Commit `d4ff0ce feat(security): H-06 limit IA`
- **Supersedes:** none
- **Verified:** 2026-07-30

---

## DEC-2026-07-30-006 — `submit-candidate` aplica allowlist no DTO e idempotência por e-mail/vaga/org

- **Status:** accepted
- **Domains:** security, upload, vagas
- **Keywords:** DTO, allowlist, ALLOWED_FIELDS, idempotência, candidatura
- **Decision:** O endpoint público `submit-candidate` constrói `body` apenas com `ALLOWED_FIELDS`, ignora campos extras e checa duplicidade por `email + organization_id + job_id` antes de inserir, retornando o `id` existente quando aplicável.
- **Rationale:** Bloqueia mass-assignment no endpoint público. Idempotência evita candidatura duplicada quando o candidato reenviar o formulário.
- **Evidence:**
  - `supabase/functions/submit-candidate/index.ts`
  - Commit `44f4c26 feat(security): H-05 DTOs públicos`
- **Supersedes:** none
- **Verified:** 2026-07-30

---

## DEC-2026-07-30-007 — Fallback OpenAI → Zen (DeepSeek) em 402/429/5xx

- **Status:** accepted
- **Domains:** ia, infra
- **Keywords:** fallback, OpenAI, Zen, DeepSeek, error 402, error 429, error 5xx
- **Decision:** Se a chamada para OpenAI retornar 402 (sem crédito), 429 (rate limit) ou 5xx (erro de servidor), o `openai-proxy` faz fallback automático para o Zen (OpenCode/DeepSeek), que mapeia `gpt-4o` → `deepseek-v4-flash-free`. Cliente recebe a resposta sem saber do fallback; metadados `_provider` e `_model` na resposta indicam qual provedor atendeu.
- **Rationale:** Garantir disponibilidade de IA mesmo durante falhas de cota. DeepSeek via Zen é gratuito.
- **Evidence:**
  - `supabase/functions/openai-proxy/index.ts` linhas 234-273
- **Supersedes:** none
- **Verified:** 2026-07-30
