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

---

## DEC-2026-07-31-001 — Remover `setState` síncrono dentro de `useEffect` em 3 arquivos

- **Status:** accepted
- **Domains:** frontend, vagas
- **Keywords:** set-state-in-effect, react-hooks, controlled component, derived state, useEffect
- **Decision:** Aplicar três padrões canônicos do React 19 para eliminar `setState` direto em `useEffect`:
  1. **Componente totalmente controlado** (`CityAutocomplete`): input com `value={value}` + `onChange` que propaga via `onChange(text)`. Sem cópia interna de prop.
  2. **Reset inline em handlers** (`Vagas.tsx`): cada onChange/onClick de filtro chama `setCurrentPage(1)` junto com o setter do filtro. Sem `useEffect` de sincronização de estado.
  3. **Inicialização no `useState`** (`SpontaneousApplication.phone`): valor derivado de país default vai direto no initial state, não em `useEffect`.
  4. **Side-effect colado no originador** (`SpontaneousApplication.triggerStepReveal`): chamar a função de animação dentro do `finally` do `fetchOrgData` em vez de em um efeito que observa `loading`.
- **Rationale:** `setState` síncrono em `useEffect` força render em cascata (regra `react-hooks/set-state-in-effect` do React 19). Os três padrões removem o efeito desnecessário mantendo comportamento idêntico e reduzindo a superfície de "renders extras" no Dashboard.
- **Trade-offs:**
  - Componente controlado exige que o pai mantenha a string canônica (`VagaForm.tsx` já fazia isso — `formData.location`). Zero regressão.
  - Reset inline exige que **toda** mutação de filtro esteja em um handler. Cobertura: 9 sites de mutação cobertos. Se alguém adicionar um novo filtro sem reset, paginação fica inconsistente — vale code review atento.
  - Mover `triggerStepReveal` antes do `useEffect` que o consome evita TDZ. Adicionado às deps do efeito.
- **Evidence:** `memory/errors.md` (ERR-2026-07-30-004). Testes: `tests/vagas/SpontaneousApplication.test.tsx` 3/3. Gates: `tsc` 0, lint local 0, `npm run build` OK, `npm test` 155/155.
- **Supersedes:** none
- **Verified:** 2026-07-31

---

## DEC-2026-07-31-002 — ERR-003 reduzido em mais 6 ocorrências (5 arquivos verdes)

- **Status:** accepted
- **Domains:** frontend, vagas, layout, candidates
- **Keywords:** set-state-in-effect, react-hooks, side-effect, external system
- **Decision:** Para os 5 arquivos onde o `useEffect` é genuinamente o padrão correto (sincronização com sistema externo), aplicar `eslint-disable-next-line react-hooks/set-state-in-effect` com **justificativa em comentário**. Para os outros 2 (PoolTalentos, AdminLogs), **remover** o efeito porque os handlers já faziam o reset inline.
- **Rationale:** Nem todo `setState` em `useEffect` é errado. A regra do lint assume "estado derivado" mas erra nos casos de "reagir a eventos externos":
  - Mudança de URL (`DashboardLayout.tsx`): `location.pathname` é um valor externo; o efeito fecha menu/chat quando a rota muda. Comportamento correto de sincronização.
  - Mudança de prop boolean (`PipelineLinkSection.tsx`): `isBlacklisted` é prop externa; o efeito limpa `linkedPipelines` quando vira `true` para evitar leak. Idem.
  - Combinação de fetch (`JobApplication.tsx`): gate `!loading && job` garante que a animação de reveal só dispara no caminho de sucesso — em erro o componente renderiza `<ErrorScreen>`. Mover para `finally` causaria animação espúria.
  - Em `AdminLogs.tsx`, o `fetchLogs()` é `async` e o lint marca a chamada de função como se fosse setState. Falso positivo — setStates internos acontecem no `then`, não síncronos.
- **Padrão aplicado:** comentário de justificativa acima do `useEffect` ou direto na linha do `setState` via `eslint-disable-next-line`. Memória do projeto (`memory/context.md` linha 53) já permite `eslint-disable` com justificativa.
- **Trade-off:** Mantém um `eslint-disable` no repo. Aceitável porque (a) é localizado, (b) tem justificativa escrita, (c) o efeito é genuinamente o caso correto do hook. Alternativa seria desabilitar a regra global — pior, esconde problemas reais.
- **Pitfall encontrado:** ao usar `replace_all=true` no patch, removi duas ocorrências idênticas e corrompi `JobApplication.tsx` (perdeu dois `useState` no meio do arquivo). Detectado, revertido com `git checkout -- <file>`, e refiz em 4 patches isolados. **Lição:** nunca usar `replace_all` sem conferir manualmente que cada match é seguro.
- **Evidence:** `npm run lint` geral: 14 → 7 erros de `set-state-in-effect`. `npm test`: 155/155. `npm run build`: OK.
- **Supersedes:** none
- **Verified:** 2026-07-31

---

## DEC-2026-08-04-005 — RLS hardening: TO authenticated + deny explícito pra anon em tabelas sensíveis

- **Status:** accepted
- **Domains:** security, rls, pii
- **Keywords:** anon, RLS, IS NOT DISTINCT FROM, public, authenticated, candidates, organizations, vagas_white_label
- **Decision:** Tabelas com PII (`candidates`, `organizations`, `vagas_white_label`) devem ter policies RLS **restritas a `authenticated`** (`TO authenticated`) + policy `deny all` explícita para `anon` (`USING (false) WITH CHECK (false)`). Combo garante que mesmo policies legítimas com `roles = {public}` não vazem.
- **Rationale:** Audit dogfood 2026-08-04 descobriu que policies existentes tinham `roles = {public}` (válidas pra anon + authenticated + service_role). Policies com `USING (... IS NOT DISTINCT FROM get_my_org_id())` retornam `TRUE` quando comparadas contra `NULL` (porque `x IS NOT DISTINCT FROM NULL` é `FALSE` se x é UUID, e `NOT FALSE` é `TRUE`). Resultado: anon conseguia ler todas as linhas cujo `organization_id` era UUID não-NULL.
- **Solução em 2 migrations:**
  - **090**: drop policies `USING (true)` em `organizations`; criar deny explícito pra `anon` em `candidates` e `vagas_white_label`.
  - **091**: re-criar policies legítimas com `TO authenticated` explícito (multitenancy, access_v4, convidado_select). Policies passam a não existir pra `anon` — combinadas com deny da 090, anon só vê deny = bloqueado.
- **Não-quebra verificado:** Edge Functions usam `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS); portal público (`/carreiras/:orgId`) chama Edge Function; dashboard autenticado usa `authenticated` token. Login + inscrição + fluxo de candidato + admin continuam funcionando.
- **Evidence:**
  - `supabase/migrations/090_block_anon_sensitive_tables.sql`
  - `supabase/migrations/091_restrict_policies_to_authenticated.sql`
  - Probe pós-fix: `candidates=0`, `organizations=0`, `vagas_white_label=0`, `profiles=0`, `vagas_candidaturas=0` (todas via `SET ROLE anon`).
  - Dogfood report: `dogfood-output/report.md`
- **Supersedes:** none
- **Verified:** 2026-08-04

---

## DEC-2026-08-04-006 — Limpeza de Storage órfão via Dashboard do Supabase (não Edge Function)

- **Status:** superseded
- **Domains:** security, storage, dashboard
- **Keywords:** storage.objects, orphan, purge, dashboard, resumes bucket
- **Decision:** Objetos órfãos do bucket `resumes` (deletado mas com objetos ainda hospedados) são limpos manualmente pelo Dashboard do Supabase: recriar bucket `resumes` (privado), entrar na pasta do user_id, deletar PDF, deletar bucket. **Edge Function dedicada não é necessária** — operação one-shot manual é mais simples e não requer deploy nem service_role key.
- **Rationale:** Migration 092 zerou `candidates.resume_url` mas URLs diretas do Storage continuavam servindo 200 OK. DELETE direto via SQL falha com `42501: Direct deletion from storage tables is not allowed`. Edge Function `purge-orphan-resumes` foi deployada mas o usuário preferiu não usar curl (complexidade desnecessária pra operação pontual). Dashboard do Supabase tem UI pra deletar arquivos manualmente.
- **Trade-offs:** Dashboard é manual e não escalável pra muitos arquivos. Edge Function seria o caminho pra centenas de arquivos. Como só tem 1 candidato de teste com currículo legado, manual é OK.
- **Evidence:**
  - Migration 092: zerou `candidates.resume_url`
  - Edge Function `purge-orphan-resumes` deployada e depois deletada (cleanup manual via Dashboard escolhido)
  - Migration 093 superseded (não funcionou — ver ERR-002)
- **Supersedes:** none
- **Verified:** 2026-08-04

---

## DEC-2026-08-04-007 — Hardening de candidate_screening_logs sem organization_id local

- **Status:** accepted
- **Domains:** security, rls, audit-trail
- **Keywords:** candidate_screening_logs, allow_all_screening, authenticated, anon, organization isolation
- **Decision:** `candidate_screening_logs` deve usar somente policies `TO authenticated`. Administrador e supervisor são isolados pela organização do candidato relacionado (`candidate_screening_logs.candidate_id → candidates.organization_id`), pois a tabela de logs não possui coluna `organization_id`.
- **Rationale:** A policy remota `allow_all_screening` (`roles={public}`, `USING (true)`, `WITH CHECK (true)`) expôs 43 registros para anon. A correção remove todas as policies antigas e recria acesso para owner, administrador, supervisor, RH e convidado.
- **Evidence:** `supabase/migrations/093_harden_candidate_screening_logs.sql`; policies remotas passaram a `{authenticated}`; probe `SET ROLE anon` retornou `0`; REST anônimo retornou `[]` HTTP 200.
- **Supersedes:** none
- **Verified:** 2026-08-04

---

## DEC-2026-08-04-008 — Hardening de job_code_counters (tabela de trigger sem RLS)

- **Status:** accepted
- **Domains:** security, rls, triggers
- **Keywords:** job_code_counters, trigger, generate_vaga_job_code_persistent, anon, authenticated, organization isolation
- **Decision:** `job_code_counters` deve ter RLS habilitada com policy `FOR ALL TO authenticated` restrita a `organization_id = get_my_org_id()` + deny explícito para `anon`. A policy `FOR ALL` (não só SELECT) é obrigatória para o trigger `generate_vaga_job_code_persistent()` continuar funcionando quando um usuário autenticado cria vaga via REST (INSERT/UPDATE passam pelo WITH CHECK; service_role das Edge Functions bypassa RLS).
- **Rationale:** Dogfood round 3 (2026-08-04) encontrou `job_code_counters` exposta via REST anon. A migration 073 já havia habilitado RLS e criado policy deny-all, mas uma policy **manual** `allow_all_counters` (`roles={public}`, `USING (true)`) criada no Dashboard fora do repositório combinava por OR e liberava o acesso (4 linhas reais de `organization_id` + `last_value` de todas as orgs).
- **Lição:** (1) Tabelas de suporte a triggers/sequências ficam fora das auditorias de tabelas de negócio — auditar TODAS as tabelas do schema via REST anon. (2) **Policies criadas manualmente no Dashboard não aparecem no repositório** — ao corrigir RLS, remover TODAS as policies da tabela (loop dinâmico sobre `pg_policies`, padrão 093), não só as conhecidas do repo.
- **Evidence:** `supabase/migrations/094_harden_job_code_counters.sql`; pré-fix: REST anon 4 linhas HTTP 200; pós-fix: policies só `org scope`/`deny anon`, `SET ROLE anon` → 0, REST anon → `rows=0`; gates tsc/lint/test 169/169 OK.
- **Supersedes:** none
- **Verified:** 2026-08-04

---

## DEC-2026-08-05-001 — Remover view legada `public_vagas` (drop, não revoke)

- **Status:** accepted
- **Domains:** security, public-portal, views, anon
- **Keywords:** public_vagas, view legada, SECURITY DEFINER, anon, REST, vazamento multi-tenant
- **Decision:** A view `public.public_vagas` (resquício da migration 007) deve ser **dropada** (`DROP VIEW IF EXISTS`), não apenas revogada. Ela é código morto + risco de vazamento multi-tenant.
- **Rationale:** O Security Advisor do Supabase alertou que a view é `SECURITY DEFINER` (owner `postgres`, sem `security_invoker`) com `SELECT` grant para `anon` e filtro só de `is_active` — **sem filtro de organização**. Qualquer pessoa via `GET /rest/v1/public_vagas` enxergava vagas ativas de TODAS as organizações. Grep confirmou 0 usos: nem `src/`, nem Edge Functions (`public-jobs`/`public-job-detail` consultam `vagas_white_label` direto com service_role + `.eq('organization_id', orgId)`). Opção `security_invoker` descartada: com as migrations 090/091 (deny anon na tabela base), o anon veria 0 vagas — view ficaria inútil.
- **Trade-offs:** Drop é irreversível se algo externo (fora do repo) consultasse a view — grep não achou nada; portal público verificado ao vivo após o drop (Edge Function `public-jobs` responde 200 com orgInfo + vagas).
- **Evidence:**
  - `supabase/migrations/096_drop_legacy_public_vagas_view.sql`
  - Pré-fix: `pg_policies`/`pg_class` mostraram owner `postgres`, `reloptions NULL` (sem security_invoker), grants SELECT p/ `anon`+`authenticated`
  - Pós-fix: `SELECT count(*) FROM pg_class WHERE relname='public_vagas'` → 0; `GET /rest/v1/public_vagas` → HTTP 404
  - Portal: `GET /functions/v1/public-jobs?orgId=<id>` → 200 com orgInfo + vagas
- **Supersedes:** none
- **Verified:** 2026-08-05
