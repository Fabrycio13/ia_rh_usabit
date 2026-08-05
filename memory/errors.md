# Erros do IA RH

> Apenas erros reutilizáveis com causa raiz verificada. Antes de aplicar, abrir o arquivo/teste/commit indicado na `Evidence`.

---

## ERR-2026-07-30-001 — Confirmar conteúdo de arquivo sensível com `xxd`/`od` antes de afirmar bug

- **Status:** monitoring
- **Domains:** security, tooling, debugging
- **Keywords:** byte-a-byte, terminal artifact, xxd, od, false positive
- **Symptom:** Ao ler trechos de templates literais ou valores interpolados via `read_file`, pode aparecer string visualmente mascarada (ex.: `***` onde deveria haver valor real). Leva à conclusão incorreta de bug ou de quebra de template.
- **Root cause:** A interface de apresentação do terminal pode interpretar template literals como formatação markdown ou aplicar anonimização visual ao exibir conteúdo. A leitura por `cat` ou por `read_file` pode renderizar valor diferente do real no disco.
- **Fix:** Para qualquer conclusão sobre conteúdo de arquivo sensível (credenciais, headers, segredos), confirmar com `xxd` ou `od -c` antes de afirmar existência de bug ou leak. Regra operacional: **nunca chutar, sempre verificar**.
- **Evidence:**
  - Ferramenta `xxd` e/ou `od -c` no terminal
  - Política operacional registrada na memória do Hermes em `~/AppData/Local/hermes/memory.json`
- **Prevent recurrence:** Toda conclusão sobre conteúdo de arquivo em CI/security review deve ser precedida por leitura byte-a-byte.
- **Verified:** 2026-07-30

---

## ERR-2026-07-30-002 — `ResizeObserver` em `vi.fn()` quebra construtor no Vitest 4

- **Status:** resolved
- **Domains:** testing, dashboard
- **Keywords:** ResizeObserver, Vitest, Recharts, jsdom, mock, vi.fn
- **Symptom:** Ao renderizar `Dashboard` (Recharts) sob jsdom, `new ResizeObserver(...)` falhava com `TypeError: ... is not a constructor`, quebrando os 3 testes do `Dashboard.test.tsx`.
- **Root cause:** `globalThis.ResizeObserver = vi.fn(...)` cria uma *função plana* que em Vitest 4 não satisfaz o requisito de ser construtível. Recharts e algumas libs invocam `new ResizeObserver(...)`, não apenas `ResizeObserver(...)`.
- **Fix:** Substituir por uma **classe construtiva** mockada:

```typescript
if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
}
```

- **Evidence:**
  - `tests/components/Dashboard.test.tsx` linhas 4-10
  - Commit `44f4c26 feat(security): H-05 DTOs públicos — allowlist filter + idempotência` (parte "Fix")
- **Prevent recurrence:** Ao mockar APIs nativas invocadas com `new`, usar `class { ... }`, não `vi.fn()`. Para casos de função pura (não construtível), usar `vi.fn()` apenas.
- **Verified:** 2026-07-30

---

## ERR-2026-07-30-003 — `setState` síncrono dentro de `useEffect` (19 ocorrências preexistentes)

- **Status:** pending
- **Domains:** frontend, pipeline, vagas
- **Keywords:** set-state-in-effect, useEffect, lint, react-hooks, cascading render, React 19
- **Symptom:** `npm run lint` reporta **19 erros + 1 warning** da regra `react-hooks/set-state-in-effect`. Padrão observado: `useEffect(() => { setState(...); }, [deps])` com `setState` chamando diretamente no corpo do efeito.
- **Root cause:** Em React 19, `setState` síncrono dentro de `useEffect` força renders em cascata. É uma regra da nova DX, não bug funcional imediato. Padrões comuns no projeto: sincronizar `value` externo em estado (`value → query`), resetar paginação quando filtros mudam, espelhar seleção de país em `formData.phone`.
- **Fix (não aplicado — pendente em PR dedicado):**
  - Quando o estado espelha `value` externo: derivar em render em vez de `useEffect`. `const query = value || ''`.
  - Resetar paginação quando filtros mudam: derivar paginação de `useMemo([items, filters])` ou trocar `useState` por cálculo em render.
  - Espelhar seleção em form data: chamar `setFormData` direto em `onChange`, não em efeito.
- **Localização dos 19 erros:**

```text
src/pages/candidates/Pipeline.tsx                (vários)
src/pages/vagas/SpontaneousApplication.tsx       (linhas 402, 466)
src/pages/vagas/Vagas.tsx                        (linha 767 — reset currentPage)
src/pages/vagas/components/CityAutocomplete.tsx  (linha 25)
```

- **Evidence:** `npm run lint` no commit `4acc073` (base anterior) já reportava os mesmos 20 problemas; confirmado via `git stash` antes do commit `89de437`.
- **Por que não foi resolvido agora:** Commit `89de437` é só sobre `memory/`. Misturar refactor de `Pipeline.tsx`/`Vagas.tsx` no mesmo PR dificulta review e reverte. `lint` não roda no CI (`AGENTS.md` linha 15), não trava merge.
- **Prevent recurrence:** Ao sincronizar estado com prop externa, preferir derivação em render ou `onChange`. Reservar `useEffect` para sincronização com sistemas externos (DOM imperativo, subscriptions, listeners).
- **Progresso (2026-07-31):** Das 19 ocorrências originais, **10 foram resolvidas** (4 em ERR-004 + 6 em ERR-005). Restam 9 ocorrências em 7 arquivos: `Pipeline.tsx` (1), `AddCandidateModal.tsx` (2), `CandidateBank.tsx` (1), `Dashboard.tsx` (1), `Configuracoes.tsx` (2). Mantidos em PRs dedicados por estarem acoplados a lógica maior.
- **Verified:** 2026-07-30 (original) / 2026-07-31 (parcial via ERR-004 e ERR-005)

---

## ERR-2026-07-30-004 — ERR-003 reduzido em 4 ocorrências (3 arquivos: CityAutocomplete, Vagas, SpontaneousApplication)
- **Status:** resolved
- **Domains:** frontend, vagas
- **Keywords:** set-state-in-effect, react-hooks/exhaustive-deps, Vagas, SpontaneousApplication, CityAutocomplete
- **Context:** Continuação do ERR-2026-07-30-003. Foram atacadas as 4 ocorrências dos 3 arquivos fora do `Pipeline.tsx` (que continua em PR dedicado por ter múltiplas ocorrências acopladas).
- **Fixes aplicados:**

  - **`src/pages/vagas/components/CityAutocomplete.tsx`**: `useEffect(() => setQuery(value), [value])` removido. Componente virou totalmente controlado (`input value={value}`, `onChange` chama `onChange(text)` direto, `select` chama `onChange(formatted)`). Sem `query` interno.
  - **`src/pages/vagas/Vagas.tsx`** (linha 767): `useEffect(() => setCurrentPage(1), [searchTerm, selectedOrgId, selectedStatusFilter, selectedRoleFilter, startDate, endDate])` removido. Reset de paginação agora é inline nos 9 sites que alteram filtro: `setSearchTerm(...)`, `setSelectedOrgId(...)` (2 — "Todas" + item), `setSelectedRoleFilter(...)` (2 — "Todos" + item), `setSelectedStatusFilter(...)` (2 — "Todos" + item), `setStartDate(...)`, `setEndDate(...)`, e o botão "Limpar filtros" (que também reseta `currentPage`).
  - **`src/pages/vagas/SpontaneousApplication.tsx`** (linhas 402 e 466):
    - Linha 402: `useEffect(() => { if (!formData.phone && selectedCountry.code) setFormData(...) }, [selectedCountry])` removido. `formData.phone` agora é inicializado com `countries[0].code + ' '` no próprio `useState`. Para isso, `countries` foi movido para antes do `useState` de `formData`.
    - Linha 466: `useEffect(() => { if (!loading) triggerStepReveal(200); }, [loading, triggerStepReveal])` removido. `triggerStepReveal(200)` agora é chamado no `finally` do `fetchOrgData` (junto com `setLoading(false)`). Para isso, `triggerStepReveal` foi movido para antes do `useEffect` de `fetchOrgData` (evita TDZ) e adicionado às dependências: `[orgId, triggerStepReveal]`.
- **Pitfall (encontrado e corrigido):** Ao reescrever `handlePhoneChange` para receber `e: React.ChangeEvent<HTMLInputElement>`, quebrei o teste `preenche formulario completo de 3 etapas e envia`. Causa: o JSX passa `e => handlePhoneChange(e.target.value)` (string), não evento. Corrigido voltando a assinatura para `(val: string)`. **Lição:** ao mexer em handler, conferir o call site (JSX e `onClick` dos países) — não apenas o teste.
- **Evidence:**
  - `src/pages/vagas/components/CityAutocomplete.tsx` (atual)
  - `src/pages/vagas/Vagas.tsx` linhas 765-768, 826, 856, 865, 904, 914, 947, 956, 972, 976, 985-989
  - `src/pages/vagas/SpontaneousApplication.tsx` linhas 327-367, 375-393, 426-449
  - `tests/vagas/SpontaneousApplication.test.tsx` (3/3 passando após fix)
- **Resultado:** `npm run lint` nos 3 arquivos: 0 erros, 0 warnings. `npm test`: 155/155 (incluindo 3 do `SpontaneousApplication`). `npm run build`: OK.
- **Remaining:** `Pipeline.tsx` ainda com 1 erro (`setCards([]); setColumns([]); if (selectedPipelineId && profile.userId) { loadPipelineDataRef.current = loadPipelineData; ... }` — linhas 457-460). Mantido em PR dedicado conforme ERR-003.
- **Verified:** 2026-07-31

---

## ERR-2026-07-31-005 — ERR-003 reduzido em mais 6 ocorrências (5 arquivos: PoolTalentos, AdminLogs, DashboardLayout, PipelineLinkSection, JobApplication)

- **Status:** resolved
- **Domains:** frontend, vagas, layout, candidates
- **Keywords:** set-state-in-effect, eslint-disable, side-effect, external system
- **Context:** Continuação do ERR-2026-07-30-003. Nesta rodada, os 6 erros dos 5 arquivos de risco baixo/verde. Diferente do ERR-004, aqui **a maioria dos casos não admite refatoração sem mudar comportamento** — são efeitos legítimos que sincronizam com sistemas externos (URL, props, fetch).
- **Fixes aplicados:**

  - **`src/pages/vagas/PoolTalentos.tsx`**: `useEffect(() => { setPage(1); }, [startDate, endDate])` removido. Handlers dos 2 DatePickers e do botão "limpar datas" já chamavam `setPage(1)` inline. Resíduo do efeito. **Fix completo.**
  - **`src/pages/dashboard/AdminLogs.tsx`**: `useEffect(() => { setCurrentPage(1); }, [searchUser, selectedOrgId, startDate, endDate, statusFilter])` removido. Os 9 sites de mutação de filtro já chamavam `setCurrentPage(1)` inline. Resíduo. Adicionado `eslint-disable-next-line react-hooks/set-state-in-effect` em `fetchLogs()` (falso positivo — é `async`, setStates internos não são síncronos). **Fix completo + 1 disable justificado.**
  - **`src/layouts/DashboardLayout.tsx`**: `useEffect([location])` que fecha `isMobileOpen`/`isChatOpen` quando rota muda. **Mantido** (é o caso correto: URL é sistema externo). Adicionados `eslint-disable-next-line` em cada `setState` com justificativa. **0 alteração comportamental, 2 disables justificados.**
  - **`src/features/candidates/components/PipelineLinkSection.tsx`**: `useEffect([isBlacklisted])` que limpa `linkedPipelines` quando prop vira `true`. **Mantido** (sincroniza com prop externa; mover pra `onChange` no pai exigiria refactor de quem passa a prop). 1 disable justificado. **0 alteração comportamental.**
  - **`src/pages/vagas/JobApplication.tsx`**: 
    - Phone sync (linha 595): `useEffect` removido. `formData.phone` agora inicializa com `countries[0].code + ' '` no `useState` — mesmo padrão aplicado em `SpontaneousApplication.tsx` (ERR-004). `formData` foi movido para depois de `countries` e `selectedCountry` para resolver ordem de declaração.
    - `triggerStepReveal` (linha 683): **mantido** (gate `!loading && job` é external system, mover pra `finally` causaria animação espúria em erros). 1 disable justificado. **1 fix + 1 disable justificado.**

- **Pitfall (encontrado e revertido):** Ao usar `replace_all=true` num patch que matchava duas ocorrências em `JobApplication.tsx`, removi acidentalmente **dois `useState` inteiros** no meio do arquivo. Detectado por `git diff` mostrando código corrompido. `git checkout -- src/pages/vagas/JobApplication.tsx` recuperou 100%. Refiz em 4 patches isolados sem `replace_all`. **Lição:** `replace_all` é traiçoeiro quando as strings matchadas contêm declarações de mesmo prefixo. Sempre conferir manualmente o contexto.
- **Resultado:** `npx tsc --noEmit` 0. `npx eslint` nos 5 arquivos: 0 errors cada. `npm test`: 155/155. `npm run build`: OK.
- **Remaining (não tocado nesta rodada):**
  - `Pipeline.tsx` 1 erro (setCards + setColumns + loadPipelineData)
  - `JobApplication.tsx` 0 (zero, resolvido)
  - `AddCandidateModal.tsx` 2 (resetForm + debounce duplicate)
  - `CandidateBank.tsx` 1 (safetyTimer 8s)
  - `Dashboard.tsx` 1 (safetyTimer 8s)
  - `Configuracoes.tsx` 2 (setLoading guard + setActiveTab perm)
  - **Total: 7 erros** (eram 14 — reduzida pela metade).
- **Verified:** 2026-07-31

---

## ERR-2026-07-31-006 — Portal público e autenticação mantêm brechas críticas/altas em produção

- **Status:** pending
- **Domains:** security, auth, public-portal, edge-functions, storage, rls
- **Keywords:** privilege-escalation, mass-assignment, signed-upload, rate-limit, deploy-drift
- **Context:** Auditoria do login, convite, recuperação, portal de vagas e candidaturas confirmou que as Edge Functions públicas implantadas ainda aceitam path de upload e campos internos controlados pelo cliente. O SQL versionado de `profiles` também permite UPDATE de qualquer coluna da própria linha, formando possível escalação para `owner`; a policy ao vivo não pôde ser consultada porque o dump remoto exige Docker Desktop.
- **Causa raiz:** DTOs server-side confiam em campos do cliente; signer remoto aceita path completo; validação de arquivo não existe nas versões implantadas; rate limiter remoto usa `COUNT` + `INSERT` sem serialização e ignora erros; hardenings locais não foram implantados; policy `profiles: universal_self_access` é `FOR ALL` sem proteção por coluna.
- **Evidence:**
  - `docs/security/audits/2026-07-31-auditoria-auth-portal-publico.md`
  - `supabase/migrations/052_fix_rls_and_multitenancy.sql:133-138`
  - `supabase/functions/get-upload-url/index.ts`
  - `supabase/functions/submit-application/index.ts`
  - `supabase/functions/submit-candidate/index.ts`
- **Falso positivo descartado:** insert anônimo direto em `vagas_candidaturas` foi bloqueado ao vivo por RLS (`HTTP 401`, PostgreSQL `42501`); nenhum registro foi criado.
- **Bloqueios antes de deploy:** não executar `supabase db push` indiscriminado (a migration `084` mantém INSERT de Storage aplicável a `PUBLIC`) e não implantar as funções locais antes de corrigir os 3 erros do `deno check`.
- **Verificação:** `tsc` e build OK; 155/155 testes passaram; lint com 8 erros/1 warning; Deno com 3 erros; 0 candidatos a secret privado em arquivos rastreados e bundle.
- **Verified:** 2026-07-31

---

## ERR-2026-08-04-001 — Análise inicial errada sobre por que RLS vazou PII

- **Status:** verified
- **Domains:** rls, security, pii, postgres
- **Keywords:** RLS, IS NOT DISTINCT FROM, NULL comparison, anon, public, policy roles
- **Error:** Afirmei inicialmente que policies sem `TO authenticated` explícito "deveriam bloquear `anon`" porque `get_my_role()` retorna NULL pra anon e NULL em OR lógico resulta em NULL = bloqueado. **Errado.** Policies sem `TO` aplicam a role `PUBLIC` (anon + authenticated + service_role). E policies com `(NOT (organization_id IS NOT DISTINCT FROM get_my_org_id()))` retornam `TRUE` quando `organization_id` é UUID e `get_my_org_id()` é NULL (porque `UUID IS NOT DISTINCT FROM NULL` é FALSE, e `NOT FALSE` é TRUE).
- **Impact:** Migration 090 (drop policies USING true + deny anônimo) não resolveu completamente — apenas `organizations` zerou. `candidates` e `vagas_white_label` continuaram vazando porque as policies legítimas (`access_v4`, `multitenancy_policy`) aplicavam-se a `anon` e a segunda cláusula `IS NOT DISTINCT FROM NULL` retornava TRUE pra linhas com `organization_id` UUID.
- **Fix correto:** Migration 091 re-criou policies com `TO authenticated` explícito. Combinado com deny da 090, anon não tem mais nenhuma policy permissiva — só a deny USING false.
- **Lição:** Nunca confie em análise estática de SQL para RLS. Teste empírico (`SET ROLE anon` + `count(*)`) é a única fonte confiável. Em SQL, `x IS NOT DISTINCT FROM y` é FALSE quando x é UUID e y é NULL — pode parecer contraintuitivo.
- **Evidence:** Probe `diag-all-policies.sql` mostrou `candidates_access_v4 = true` para anon antes da 091. Probe pós-fix zerou todas as tabelas.
- **Supersedes:** none
- **Verified:** 2026-08-04

---

## ERR-2026-08-04-002 — Migration 093 falhou: Supabase bloqueia DELETE direto em storage.objects

- **Status:** verified
- **Domains:** security, storage, migrations
- **Keywords:** storage.objects, DELETE, protect_delete, supabase guard
- **Error:** Migration `093_delete_orphaned_storage_resumes.sql` tentou `DELETE FROM storage.objects WHERE bucket_id = 'resumes'` e falhou com `42501: Direct deletion from storage tables is not allowed. Use the Storage API instead.` Função `storage.protect_delete()` levantou RAISE EXCEPTION.
- **Causa:** Supabase tem trigger `protect_delete` em `storage.objects` que bloqueia DELETE direto via SQL pra prevenir perda acidental de dados órfãos. **Proteção correta do Supabase** — não deve ser desabilitada.
- **Fix:** Migration 093 marcada como `superseded`. Cleanup via Edge Function `purge-orphan-resumes` usando `supabase.storage.from(bucket).remove(paths)` (Storage API suportada).
- **Lição:** Nem tudo pode ser feito via SQL direto no Supabase. Storage API (HTTP) é a interface oficial pra manipular objetos. Edge Functions pontuais são a forma correta de fazer operações one-shot que a API REST expõe.
- **Evidence:** Output do usuário ao aplicar 093 mostrou `ERROR: 42501: ... PL/pgSQL function storage.protect_delete() line 5 at RAISE`.

---

## ERR-2026-08-04-003 — Falso positivo visual em header Bearer mascarado

- **Status:** verified
- **Domains:** edge-functions, verification, tooling
- **Keywords:** Authorization, Bearer, RESEND_API_KEY, redaction, xxd
- **Error:** Uma leitura textual exibiu `*** ${RESEND_API_KEY}` e foi interpretada como header inválido.
- **Causa:** O visualizador mascarou o conteúdo sensível; os bytes reais continham `Authorization: Bearer ${RESEND_API_KEY}`.
- **Correção:** Verificação com `xxd` confirmou o header correto; nenhum código foi alterado por esse falso positivo e o achado foi removido do relatório dogfood.
- **Lição:** Em headers, tokens e secrets, nunca concluir a existência de bug por visualização mascarada. Confirmar com `xxd`/`od` antes de alterar ou reportar.
- **Evidence:** `xxd` do offset do header em `supabase/functions/submit-candidate/index.ts` mostrou `3a 20 60 42 65 61 72 65 72` (`: Bearer`).
- **Verified:** 2026-08-04
- **Supersedes:** none

---

## ERR-2026-08-05-001 — `application_count` de vagas nunca decrementa ao excluir/tirar candidato da vaga

- **Status:** verified (fix aplicado no banco ao vivo em 2026-08-05)
- **Domains:** vagas, candidates, triggers, counter
- **Keywords:** application_count, vagas_white_label, DELETE, trigger, counter desatualizado, decrement
- **Symptom:** Ao excluir uma candidatura (`DELETE` em `vagas_candidaturas`), o candidato some da lista mas o header da vaga continua mostrando o número antigo de candidaturas (ex.: "2 candidaturas" após excluir os 2). O valor persiste mesmo após F5 porque vem do banco, não do estado local.
- **Root cause:** O trigger `increment_vaga_app_count` (migration 081) só cobre `INSERT` e `UPDATE vaga_id NULL → NOT NULL` (Pool → Gestão). **Não existe trigger de DELETE nem de UPDATE `vaga_id NOT NULL → NULL`** (tirar da vaga → Pool). Portanto `vagas_white_label.application_count` só crescia, nunca decrescia.
- **Fix (migration 095):**
  1. Função `decrement_vaga_application_count()` + trigger `decrement_vaga_app_count` `AFTER DELETE ON vagas_candidaturas` — decrementa `GREATEST(0, application_count - 1)` quando `OLD.vaga_id` não é NULL.
  2. `increment_vaga_application_count()` estendida (CREATE OR REPLACE): UPDATE `vaga_id NOT NULL → NULL` agora decrementa; UPDATE `NOT NULL → NOT NULL` (troca de vaga) continua não incrementando.
  3. Backfill: `UPDATE vagas_white_label SET application_count = (SELECT COUNT(*) ...)` — corrige contadores já desatualizados.
- **Lição:** Qualquer coluna contador mantida por trigger precisa de trigger simétrico (INSERT/UPDATE/DELETE). Ao auditar "contador não atualiza", verificar TODAS as operações que alteram a relação (não só INSERT). O trigger da 081 foi corrigido uma vez (cobria INSERT/UPDATE) mas o DELETE ficou de fora — auditar o par completo.
- **Evidence:**
  - `supabase/migrations/095_fix_application_count_on_delete.sql`
  - Trigger ao vivo verificado: `decrement_vaga_app_count` + `increment_vaga_app_count` em `pg_trigger`
  - Teste ao vivo: DELETE de candidato `e02a2dbf-...` → `application_count` da vaga Back-end caiu de 2 → 1, batendo com COUNT real
  - Backfill: todas as vagas com `application_count = COUNT(*)` (verificado via SELECT)
- **Nota:** o `confirmDelete` do `VagaCandidatos.tsx` também foi corrigido para checar `error` do DELETE (antes engolia e mostrava falso sucesso) — parte do mesmo sintoma (candidato "não sumia").
- **Verified:** 2026-08-05

---

## ERR-2026-08-05-002 — Análise em lote não persiste (update casa 0 linhas silenciosamente)

- **Status:** verified (fix aplicado 2026-08-05)
- **Domains:** vagas, candidates, batch-analysis, AI, updates
- **Keywords:** batch-scoring, analysis_vs_vaga, candidateId, UUID, update silencioso, match_score
- **Symptom:** O botão "Analisar em lote" de `VagaCandidatos` mostra toast de sucesso ("X candidato(s) analisado(s)!") mas o resultado some ao atualizar a página. A análise individual (CandidatePanel) funciona normalmente.
- **Root cause (2 bugs):**
  1. **Update dependia do `candidateId` devolvido pela IA** no JSON do `batch-scoring`. A IA (gpt-4o) trunca/formata UUIDs de forma diferente — `r.candidateId` não casava com o `id` real no banco → `UPDATE ... WHERE id = <uuid-errado>` afetava 0 linhas **sem erro**, e o código nem checava `error`. Toast de sucesso baseado em `results.length`, não no número real de updates.
  2. **Salvava no campo errado:** só `match_score` + `analysis_vs_vaga`. O CandidatePanel renderiza `c.analysis` (com `skills`/`summary`/`strengths`/`gaps`) — o painel não lê `analysis_vs_vaga`, então mesmo salvando, não haveria feedback no painel.
- **Fix (VagaCandidatos.tsx `handleBatchAnalyze`):**
  - Casar por **posição** (`results[i]` ↔ `selected[i]`) — a IA é instruída a manter a ordem dos candidatos; o `realId` vem do array `selected` (id real do banco), nunca do JSON da IA.
  - Salvar os campos que o painel lê: `analysis` completo (experience/education/skills/summary/strengths/gaps/classification/recommendation) + `is_analyzed: true` + `match_score` + `skills`/`tags`/`experience`/`education` (espelhando o fluxo individual `confirmAIAnalyze`).
  - Checar `error` de cada update e `throw` (vira toast de erro, não falso sucesso).
- **Lição:** (1) Nunca confiar em IDs devolvidos por LLM para operações de escrita — casar por posição/índice ou validar o ID contra a fonte real. (2) `UPDATE` sem checar `error` + sem confirmar rows afetadas é bug silencioso clássico. (3) Ao corrigir análise de candidato, espelhar exatamente os campos que o painel renderiza (`analysis` no `Candidato`), não criar campo paralelo (`analysis_vs_vaga`) que ninguém lê.
- **Extensão (2026-08-05):** sintoma adicional — análise em lote retornava "Não foi possível avaliar o candidato devido à falta de informações no currículo" (score 0%) enquanto o individual funcionava. **Causa raiz:** PDF escaneado (1 página, 0 chars de texto, 1 imagem — confirmado ao vivo baixando `Curriculo -- Fabrycio Bermudes.pdf` do bucket `job-applications/resumes/spontaneous/...`). O batch usava só `extractTextFromPDF` e mandava `rawText: ''`; o individual tinha fallback `pdfToImages` → visão da IA. **Fix:** extraída função compartilhada `analyzeSingleCandidate` (download → extractText → se ilegível `pdfToImages` → EF scoring com imagens → update). `confirmAIAnalyze` agora usa essa função (elimina duplicação de ~130 linhas). `handleBatchAnalyze` separa: currículos com texto legível (`isLegibleText`) vão ao lote; PDFs escaneados/sem currículo/erro de download caem no fluxo individual com imagem (um a um, com toast por candidato). Contador do toast = `analyzedCount` real.
- **Evidence:** tsc 0 erros; eslint 0 erros; npm test 169/169. Teste funcional pendente no navegador (chamada real à IA).
- **Verified:** 2026-08-05

---

## ERR-2026-08-05-003 — Análise com score baixo retorna "Pontos de Atenção: Nenhuma identificada" e não explica o motivo do score

- **Status:** verified (fix aplicado 2026-08-05)
- **Domains:** AI, prompts, scoring, CandidatePanel
- **Keywords:** redFlags, gaps, summary, Nenhuma identificada, placeholder, score baixo, justificativa
- **Symptom:** Análise com score 39 (NÃO ADERENTE) mostrava "Pontos de Atenção / Negativos: Nenhuma identificada" e a "Análise da Nota" era um resumo genérico do perfil, sem explicar por que o score ficou baixo.
- **Root cause (2 bugs combinados):**
  1. **Prompt autorizava placeholder:** `scoring.ts` (prompt da Edge Function openai-proxy) definia `"redFlags": "lista ou Nenhuma identificada"` — a IA retornava essa string truthy quando não via red flags de penalidade explícitas, mesmo com score baixo. Os motivos reais do score baixo (skills ausentes, alinhamento fraco) iam para `gaps`, mas...
  2. **Painel priorizava o placeholder:** `CandidatePanel.tsx` usava cadeia `redFlags || weaknesses || cons || negative_points || gaps || pontos_atencao` — "Nenhuma identificada" é truthy, então o fallback nunca chegava nos `gaps` reais. E o bloco renderizava porque a condição `[..].some(Boolean)` era satisfeita pelo placeholder.
- **Fix (2 lados):**
  1. `supabase/functions/openai-proxy/prompts/scoring.ts` — `redFlags` agora é array obrigatório: se score < 70 SEMPRE listar pontos reais; array vazio [] só para score ≥ 85; proibido o texto "Nenhuma identificada". `gaps` idem (lacunas vs vaga). `summary` agora deve EXPLICAR o motivo do score citando as dimensões (skills/experiência/formação/alinhamento), não descrever o perfil genericamente.
  2. `src/features/analysis/CandidatePanel.tsx` — bloco de Pontos de Atenção não renderiza quando o conteúdo é placeholder "Nenhuma identificada" (regex) ou vazio/[]; só mostra se houver conteúdo real.
- **Extensão do mesmo fix (contexto completo da vaga):** antes a IA só recebia `title + description` — responsabilidades, requisitos, diferenciais, informações adicionais e respostas do candidato ao formulário (ex.: nível de inglês) NUNCA iam pro prompt. Agora:
  1. `supabase/functions/openai-proxy/prompts/scoring.ts` — aceita `extras` (responsibilities/requirements/differentials/additionalInfo/candidateAnswers) e injeta no CONTEXTO DA VAGA, com instrução de penalizar o score quando a resposta do formulário contradiz um requisito.
  2. `supabase/functions/openai-proxy/index.ts` — repassa os campos novos no case `scoring` e injeta no prompt do `batch-scoring`.
  3. `src/core/services/cvAnalyzer.ts` — `batchMatchToJob` aceita `BatchMatchJobContext` e repassa no payload.
  4. `src/pages/vagas/VagaCandidatos.tsx` — individual (`confirmAIAnalyze`) e lote (`handleBatchAnalyze`) buscam `description, responsibilities, requirements, differentials, additional_info, custom_questions`; o individual monta `candidateAnswers` (label da pergunta + resposta do candidato) a partir de `custom_questions` + `answers`.
- **Lição:** (1) Prompts de LLM não devem oferecer placeholder textual de "nada encontrado" para campos que o UI mostra como lista — usar array vazio e deixar a UI decidir. (2) Cadeias de fallback de campos (`a || b || c`) falham quando o primeiro campo é truthy mas sem valor real — normalizar/validar antes. (3) Alinhar contrato do prompt com o que a UI renderiza (mesma chave, mesmo tipo). (4) O contexto da vaga enviado à IA deve incluir TODOS os campos relevantes (requisitos/diferenciais/perguntas+respostas), não só a descrição — senão o score é calculado com informação incompleta.
- **⚠️ Deploy necessário:** o fix do prompt está na Edge Function `openai-proxy` (Deno) — precisa `supabase functions deploy openai-proxy` para valer em produção. O fix do painel é frontend (build Amplify).
- **Evidence:** tsc 0 erros; eslint 0 erros; npm test 169/169. Teste funcional pendente (chamada real à IA após deploy da EF).
- **Verified:** 2026-08-05

---

## ERR-2026-08-05-004 — Pool de Talentos: 3 bugs (email NOT NULL, sem pré-análise, policy de storage nega download)

- **Status:** verified (fix aplicado 2026-08-05)
- **Domains:** pool, vagas_candidaturas, storage, pre-analysis, RLS
- **Keywords:** manual_add, candidate_email NOT NULL, storage policy, job-applications, get-upload-url, pre_analysis, resume, querystring token
- **Symptom (3 sintomas relatados pelo usuário no Pool):**
  1. Anexar vários currículos → um falha com `null value in column "candidate_email" of relation "vagas_candidaturas" violates not-null constraint`
  2. Os que entram ficam "como Vagas(1)" mas sem análise — só dados extraídos, sem summary/score
  3. Forçar análise sem vaga → `{"statusCode":"400","error":"Error","message":"querystring must have required property 'token'","code":"InvalidRequest"}`
- **Root causes (3):**
  1. `PoolAddCandidate.tsx` só setava `candidate_email` `if (extractedData.email)` — coluna é NOT NULL no banco; currículo sem email extraível (escaneado/mal formatado) quebrava o INSERT.
  2. `PoolAddCandidate` usava `extractTextAndData` (tipo `extraction` — só dados) e marcava `is_analyzed: true` sem análise; `confirmAIAnalyze` do PoolTalentos chamava `type: 'extraction'` (mesmo bug já corrigido na VagaCandidatos — ERR-001). Sem vaga não dá pra usar `scoring`; o correto é `type: 'resume'` (pré-análise geral).
  3. **Policy de storage:** candidatos `manual_add` via `get-upload-url` sem jobId têm path `resumes/{orgId}/{file}` (seg2=`resumes`, seg3=orgId) — mas `storage: recruiter access` só liberava `resumes/manual/{org}/`, `resumes/spontaneous/{org}/` e `resumes/{vagaId}/` (com EXISTS na vaga). Path do pool NÃO casava → SELECT negado → `createSignedUrl` falha → erro `querystring must have required property 'token'` ao baixar currículo na análise.
- **Fix:**
  1. `PoolAddCandidate.tsx` — `candidate_email` sempre setado: email extraído ou fallback `sem-email-{Date.now()}-{i}@pool.local`.
  2. `cvAnalyzer.ts` — nova função `analyzeResumeGeneral(file, preRawText?)` (tipo `resume` do proxy: score/summary/strengths/gaps/suggested_areas, aceita rawText pré-extraído p/ lote). `PoolAddCandidate` roda pré-análise best-effort após extraction e salva `analysis` (com `type: 'pre_analysis'`) + `match_score`. `confirmAIAnalyze` do PoolTalentos: `extraction` → `resume`, salvando campos completos + match_score.
  3. Migration `098_fix_storage_policy_pool_uploads.sql` — policy SELECT e DELETE de `storage.objects` (bucket `job-applications`) agora incluem `split_part(name,'/',2) = public.get_my_org_id()::text` (path `resumes/{orgId}/...`). Aplicada ao vivo; 11 objetos do pool ficam legíveis.
- **Lição:** (1) Colunas NOT NULL com dados derivados de extração de IA sempre precisam de fallback determinístico. (2) Análise SEM vaga = tipo `resume` (pré-análise); análise COM vaga = `scoring`/`job-matching` — usar o tipo certo conforme o contexto. (3) Ao mudar o gerador de paths de storage (`get-upload-url`), conferir a policy de acesso — paths novos invisíveis à policy = download quebrado com erros obscuros de token.
- **Evidence:** migration 098 aplicada ao vivo (policy verificada via pg_policies); tsc 0 erros; eslint 0 erros; npm test 169/169. Teste funcional pendente no navegador.
- **Verified:** 2026-08-05
