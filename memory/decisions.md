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
