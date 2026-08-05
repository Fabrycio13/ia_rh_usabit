# IA RH — Arquitetura dos Fluxos de Candidatura, Análise e Banco de Talentos

> **Propósito deste documento:** registrar a lógica central do produto para que
> mudanças futuras (multi-empresa, banco de talentos grande, novos fluxos) não
> quebrem comportamento existente. **Antes de alterar qualquer fluxo citado
> aqui, leia este documento + confira o schema real via `supabase db query
> --linked`** (repo e banco divergem — memória aponta evidências, não substitui
> o código).
>
> Atualizado: 2026-08-05 · Branch: `feat/security-hardening`

---

## 1. Mapa geral (visão de 50.000 pés)

```
PORTAL PÚBLICO                              DASHBOARD (RH)
┌──────────────────────────┐                ┌──────────────────────────────┐
│ 1. Vaga específica       │                │ Gestão de Vagas (VagaCandidatos)
│    submit-application    │                │   - análise individual (scoring)
│ 2. Candidatura espontânea│                │   - análise em lote (batch-scoring)
│    submit-candidate      │                │   - transferir p/ Banco de Talentos
└──────────┬───────────────┘                │   - excluir da vaga
           │                                ├──────────────────────────────┤
           ▼                                │ Pool de Talentos (PoolTalentos)
┌──────────────────────────┐                │   - adicionar currículos (manual_add)
│  vagas_candidaturas      │◄───────────────│   - pré-análise (resume)
│  (1 linha = 1 candidatura│                │   - Match em lote → vaga (UPDATE vaga_id)
│   por vaga; vaga_id NULL │                │   - reanálise individual (resume)
│   = está no Pool)        │                ├──────────────────────────────┤
└──────┬─────────┬─────────┘                │ Banco de Talentos (CandidateBank)
       │         │                          │   - candidates (master por pessoa)
       │         │                          │   - analysis.history (N vagas)
       │         └── transfer (vaga→banco)  │   - reanálise p/ vaga (job-matching)
       │                  │                 │   - excluir (desvincula, não apaga)
       │                  ▼                 └──────────────┬───────────────┘
       │         ┌───────────────┐                         │
       │         │  candidates   │───── pipeline_cards ────┤
       │         │  (master)     │     (colunas do pipe)   │
       │         └───────────────┘                         │
       └── análise de IA via openai-proxy (6 tipos) ◄──────┘
```

**Regra de ouro da modelagem:** `vagas_candidaturas` é o registro de
**candidatura** (uma linha por vaga, ou sem vaga = Pool). `candidates` é o
registro **master da pessoa** no Banco de Talentos. O vínculo é a FK
`vagas_candidaturas.candidate_id → candidates.id` (**ON DELETE SET NULL**).

---

## 2. Modelo de dados central

### 2.1 `vagas_candidaturas` — candidaturas (tabela de trabalho)

Uma linha por **candidatura**. O mesmo candidato em 2 vagas = 2 linhas.
`vaga_id NULL` significa que a candidatura está no **Pool de Talentos**.

| Campo | Papel |
|---|---|
| `id` | PK |
| `vaga_id` | FK `vagas_white_label`. **NULL = está no Pool**; preenchido = está na gestão da vaga |
| `candidate_name` / `candidate_email` | Dados do candidato naquele momento (denormalizados de propósito) |
| `candidate_id` | FK `candidates` (**master do Banco**). NULL = não está no banco |
| `resume_url` / `resume_file_name` | Currículo (storage) |
| `answers` | Respostas do formulário (JSONB), incluindo `_ai_analysis` legado |
| `status` | `pending` \| `reviewed` \| `shortlisted` \| `rejected` \| `talent_bank` |
| `source` | Origem: `public_link` \| `spontaneous` \| `manual_add` \| `transferred_from_pool` \| `talent_bank_reanalysis` |
| `match_score` | Score 0–100 (**default 0** — não confundir com "não analisado") |
| `analysis` | JSONB — análise individual **completa** (scoring) |
| `analysis_vs_vaga` | JSONB — resultado do **batch-scoring** (match em lote) |
| `raw_text` | Texto extraído do PDF (cache) |
| `candidate_email_normalizado` / `candidate_phone_normalizado` | **Generated columns** (lower/trim email; só dígitos no phone) — usadas no vínculo com o master |
| `applied_at` | Timestamp (default NOW()) — **não existe coluna `created_at`** |

**Status `talent_bank`:** significa "esta candidatura foi movida para o Banco
de Talentos". O CandidatePanel **esconde o botão "Mover para Banco"** quando
`status === 'talent_bank'`. Ao **excluir do banco**, o status é revertido para
`reviewed` (senão o botão nunca reaparece).

### 2.2 `candidates` — Banco de Talentos (master da pessoa)

Uma linha por **pessoa** (identidade: email normalizado, fallback telefone).
O histórico de análises vive em `analysis.history` (JSONB array).

| Campo | Papel |
|---|---|
| `id` | PK |
| `email` / `phone` | Dados de contato (case-sensitive no email!) |
| `email_normalizado` / `phone_normalizado` | **Generated columns** (migration 099): `lower(trim(email))` / `regexp_replace(phone,'\D','')` — chave de identidade |
| `analysis.history` | JSONB array — **uma entrada por vaga analisada** (nunca sobrescreve, acumula) |
| `score` | Último score (coluna; o painel usa history/analysis) |
| `source` | `talent_bank` (master criado por transferência) |
| `organization_id` | Isolamento por empresa (multi-tenant) |

**Formato do `analysis.history[i]`** — padrão obrigatório (lido pelo
CandidateBank/CandidatePanel):

```json
{
  "job_id": "uuid-da-vaga",
  "job_title": "Back-end",
  "job_code": "VA-28",
  "date": "2026-08-05T17:57:52.983Z",
  "score": 65,
  "summary": "texto completo explicando o score",
  "experience": "3 anos",
  "education": "Formação",
  "skills": ["Skill1"],
  "strengths": ["ponto forte"],
  "gaps": ["ponto de atenção"],
  "resume_url": "path-do-curriculo"
}
```

⚠️ **NUNCA inventar nomes de campos no history.** O CandidateBank lê:
`job_id`, `job_name || job_title`, `job_code`, `summary`, `strengths`,
`gaps`, `experience`, `education`. Escritores legados usavam `vaga_id`/
`vaga_title`/`match_rationale` (compatibilidade mantida como fallback, mas o
padrão novo é `job_*`/`summary`).

### 2.3 `vagas_white_label` — vagas

| Campo | Papel |
|---|---|
| `id` | PK (é o `vaga_id` usado em candidaturas) |
| `title` / `job_code` | Nome + numeração (ex.: "Back-end", "VA-28") — **job_code sempre exibido nos modais** |
| `status` | `aberta` \| `fechada` |
| `is_active` / `is_accepting_applications` | Flags do portal público |
| `application_count` | Contador denormalizado — **mantido por triggers** (migration 081 + 095) |
| `pipeline_id` | Pipeline padrão da vaga |
| `organization_id` | Empresa dona da vaga |
| `description` / `responsibilities` / `requirements` / `differentials` / `additional_info` / `custom_questions` | **Contexto completo enviado à IA** no scoring |

**Contador (`application_count`):** incrementa em INSERT (trigger 081);
decrementa em DELETE e em UPDATE `vaga_id NOT NULL → NULL` (trigger 095).
Backfill feito na 095. Ao excluir/transferir candidato no frontend, também
atualizar o estado local (`Math.max(0, count-1)`).

### 2.4 Pipeline (`pipelines`, `pipeline_columns`, `pipeline_cards`)

- `pipelines`: pipeline (por vaga ou por org); `vagas_white_label.pipeline_id`
- `pipeline_columns`: colunas do quadro (Triagem, Entrevista, Proposta, Aprovado, Reprovado)
- `pipeline_cards`: card do candidato na coluna; `notes` = JSON com
  `selected_job_id` / `selected_job_name` / `selected_job_score`

O `TalentTransferModal` cria o pipeline padrão da vaga se não existir e
adiciona o card (com os 3 campos em `notes`) quando o candidato é movido para
o banco.

---

## 3. Os 3 fluxos de entrada de currículo

### Fluxo 1 — Candidato envia direto para a vaga (portal)

```
Portal → EF submit-application → vagas_candidaturas (vaga_id setado,
source: 'public_link', status: 'pending')
  → Dashboard: Gestão da Vaga (VagaCandidatos)
  → Análise individual: openai-proxy type 'scoring'
  → Análise em lote: openai-proxy type 'batch-scoring'
```

- Path de storage: `resumes/<vagaId>/<arquivo>.pdf` (EF `get-upload-url` prioriza `jobId > orgId > callerUserId`)
- **Análise individual** grava: `analysis` (completo: summary, strengths,
  gaps, redFlags, classification, recommendation) + `match_score` + skills/
  tags/experience/education + `is_analyzed: true`
- **Análise em lote** (selecionar N candidatos): usa `batchMatchToJob` →
  casa resultado por **POSIÇÃO** (nunca confiar em IDs devolvidos pela IA) →
  grava `analysis` + `analysis_vs_vaga` + `match_score` + `is_analyzed`

### Fluxo 2 — Candidatura espontânea (portal, sem vaga)

```
Portal → EF submit-candidate → vagas_candidaturas (vaga_id NULL,
source: 'spontaneous', status: 'pending') → entra no POOL DE TALENTOS
```

- Dedup de envio: mesma `candidate_email + organization_id` + `vaga_id IS NULL`
  → retorna o existente (não duplica)
- Análise: quando o RH pede, usa pré-análise (`resume`) ou Match em lote

### Fluxo 3 — RH anexa currículos no Pool (dashboard)

```
Dashboard → PoolAddCandidate (até 100 arquivos) → upload via get-upload-url
→ vagas_candidaturas (vaga_id NULL, source: 'manual_add', status: 'pending')
→ extractTextAndData (extraction) + pré-análise analyzeResumeGeneral (resume)
```

- `candidate_email` é **NOT NULL** → quando a extração não acha email, usa
  fallback `sem-email-{timestamp}-{i}@pool.local` (senão o INSERT quebra)
- Path de storage: `resumes/<orgId>/<arquivo>.pdf` (policy da migration 098
  libera leitura para o RH)
- **Pré-análise** (`type: 'resume'`): score + summary + strengths + gaps +
  suggested_areas — análise GERAL, sem vaga. Best-effort: se falhar, o
  candidato ainda é salvo (sem analysis)
- `confirmAIAnalyze` do Pool também usa `resume` (análise geral)

---

## 4. Tipos de análise de IA (openai-proxy) — QUANDO USAR CADA UM

| type | Retorna | Usar para | Onde |
|---|---|---|---|
| `scoring` | score, summary, strengths, gaps, redFlags, classification, recommendation | **Análise individual com vaga** (contexto completo: requirements, differentials, answers) | VagaCandidatos (individual) |
| `batch-scoring` | array por candidato (mesmos campos) | **Match em lote** (vários currículos × 1 vaga) | VagaCandidatos (lote), PoolTalentos (Match) |
| `extraction` | só dados: name, email, skills, experience, education | **Enriquecimento cadastral** — NÃO dá feedback completo | PoolAddCandidate (extração inicial) |
| `resume` | score, summary, strengths, gaps, suggested_areas | **Pré-análise GERAL sem vaga** | Pool (adicionar + confirmAIAnalyze) |
| `job-matching` | score, summary, strengths, gaps | Reanálise no Banco (texto/currículo × vaga) | ReanalyzeCandidateModal |
| `chat` | conversa | Chat do candidato | — |

**Regras de ouro da IA:**
1. Página que precisa de "Feedback da IA" (score + pontos) usa **`scoring`** —
   `extraction` deixa o painel com feedback parcial (sintoma: "Análise da Nota"
   mostra só "X anos e Y meses")
2. **ISOLAMENTO TOTAL** obrigatório em prompts de lote (batch-scoring):
   nunca comparar candidatos entre si ("comparado ao candidato 1" = bug)
3. **Nunca confiar em IDs devolvidos pela IA** — casar resultado por posição
4. Prompt de scoring exige `redFlags` array real p/ score < 70 (proibido
   "Nenhuma identificada" placeholder que esconde gaps)
5. PDF escaneado (0 chars de texto): usar fallback `pdfToImages` → mandar
   imagem para a IA (texto puro retorna "currículo incompleto")

---

## 5. Banco de Talentos — identidade, transferência e reanálise

### 5.1 Identidade do master (como saber se a pessoa já existe)

Parâmetro (decisão DEC-2026-08-05-003):
```
1º busca: email_normalizado (lowercase + trim) na MESMA organization_id
2º fallback: phone_normalizado (só dígitos) na MESMA organization_id
nenhum → cria master NOVO
```

- Colunas **generated** (`email_normalizado`, `phone_normalizado`) existem em
  `candidates` e em `vagas_candidaturas` (migration 099)
- Uso `.limit(1).maybeSingle()` — não quebra se existirem duplicatas legadas
- Email cru é case-sensitive → "Joao@x" vs "joao@x" criavam 2 masters (bug real
  corrigido; duplicata de teste Verônica foi limpa na 099)

### 5.2 Transferência vaga → Banco (TalentTransferModal)

```
1. Monta analysisData (score, job_id, job_title, job_code, date, skills,
   experience, positivePoints, education, redFlags, resume_url)
2. Busca master (email norm → phone norm)  [seção 5.1]
3. Achou → MERGE: history = [histórico antigo, analysisData nova]  (acumula!)
   Não achou → cria master com history = [analysisData]
4. Vincula candidaturas órfãs: UPDATE vagas_candidaturas SET candidate_id =
   master.id WHERE candidate_email_normalizado = ... AND candidate_id IS NULL
5. Status da candidatura → 'talent_bank'
6. Pipeline: cria pipeline padrão da vaga se não existir + adiciona card
```

**Resultado:** mesma pessoa em 2 vagas → 1 master com `history` de 2 entradas
→ painel mostra "Vagas (2)". **Nunca sobrescreve** (merge por `job_id`).

### 5.3 Excluir do Banco (CandidateBank.confirmDeleteCandidate)

```
1. UPDATE vagas_candidaturas SET status='reviewed' WHERE candidate_id = X
   (reverte 'talent_bank' → 'reviewed' → botão "Mover pro Banco" reaparece)
2. DELETE candidates WHERE id = X
   (FK ON DELETE SET NULL desvincula candidaturas AUTOMATICAMENTE —
   NUNCA fazer DELETE manual em vagas_candidaturas por candidate_id)
```

- Excluir do banco **não apaga** candidaturas das vagas
- Reenviar da vaga depois → master não existe → **cadastro novo** (sem
  histórico antigo) — comportamento desejado

### 5.4 Reanálise no Banco (ReanalyzeCandidateModal)

```
1. Escolhe vaga → baixa currículo (ou usa raw_text) → openai-proxy
   type 'job-matching'
2. INSERT em vagas_candidaturas (vaga_id setado, candidate_id = master.id,
   source: 'talent_bank_reanalysis', status: 'reviewed', match_score)
3. PUSH no candidates.analysis.history:
   { job_id, job_title, job_code, summary, experience, education, skills,
     strengths, gaps, ... }  ← PADRÃO OBRIGATÓRIO (job_*/summary)
4. Pipeline: adiciona card se vaga tem pipeline
```

⚠️ Já quebrou: gravava `vaga_title`/`match_rationale` (ninguém lê) → painel
mostrava "Vaga Desconhecida" e "Análise da Nota: 3 anos". Sempre usar o
padrão da seção 2.2.

---

## 6. Pool de Talentos (vagas_candidaturas com vaga_id NULL)

| Ação | O que acontece |
|---|---|
| Adicionar currículos (RH) | `manual_add` + pré-análise `resume` (seção 3, fluxo 3) |
| Espontânea (portal) | `spontaneous` (seção 3, fluxo 2) |
| Analisar individual | `confirmAIAnalyze` → `resume` (análise geral) |
| **Match em lote → vaga** | `batchMatchToJob` → **UPDATE vaga_id + status 'reviewed' + source 'transferred_from_pool' + match_score + analysis_vs_vaga** — o candidato SAI do Pool e ENTRA na gestão da vaga |
| Excluir | DELETE da candidatura (candidatura do pool, não master) |

**"Tacar pra vaga" = UPDATE de `vaga_id`** (não é INSERT). O trigger de
`application_count` (081/095) cobre: UPDATE `NULL → vaga_id` incrementa;
UPDATE `vaga_id → NULL` decrementa.

**Cuidado multi-empresa:** Pool, Banco e vagas são isolados por
`organization_id` em TODAS as consultas. Ao escalar, conferir que queries
novas sempre filtram por org.

---

## 7. Regras de ouro (checklist antes de mudar algo)

1. **Nunca apagar `vagas_candidaturas` por `candidate_id`** — a FK SET NULL
   desvincula; DELETE manual apaga o candidato das vagas (bug corrigido)
2. **Nunca inventar campos no `analysis.history`** — padrão `job_*`/`summary`
   (seção 2.2); leituras legadas `vaga_*`/`match_rationale` são só fallback
3. **Análise de vaga usa `scoring`; pré-análise de pool usa `resume`; lote usa
   `batch-scoring`; extração é só dados** — trocar por engano quebra o painel
4. **Email normalizado (lower+trim), fallback telefone** — nunca comparar
   email cru para dedup
5. **Status `talent_bank` controla o botão "Mover pro Banco"** — ao
   desvincular do banco, reverter para `reviewed`
6. **`match_score` default é 0, não NULL** — "não analisado" se detecta por
   `!analysis && !analysis_vs_vaga`
7. **Batch nunca confia em IDs da IA** — casa por posição
8. **Contador `application_count` é mantido por trigger** — UPDATE/DELETE
   precisam do trigger simétrico (095 já cobre)
9. **Repo e banco divergem** — validar schema/policies ao vivo com
   `npx supabase db query --linked` antes de afirmar comportamento
10. **Multi-tenant:** toda query filtra `organization_id`; storage policies
    usam `get_my_org_id()`

---

## 8. Edge Functions e deploy

| EF | Papel | JWT |
|---|---|---|
| `openai-proxy` | Toda IA (6 tipos) | verify_jwt |
| `submit-application` | Candidatura em vaga (portal) | anon (--no-verify-jwt) |
| `submit-candidate` | Candidatura espontânea (portal) | anon |
| `get-upload-url` | Path de upload no storage | anon |
| `public-jobs` / `public-job-detail` | Portal público de vagas | anon |
| `enrich-candidate` | Enriquecimento | — |
| `send-*` | Emails transacionais | — |

**Deploy exige autorização explícita do usuário.** EFs com `_shared/` alterado
exigem redeploy de TODAS que importam o arquivo.

---

## 9. Referências (evidências)

- Schema real: `npx supabase db query --linked` (tabelas seção 2)
- Migrations recentes: `supabase/migrations/095_fix_application_count_on_delete.sql`,
  `096_drop_legacy_public_vagas_view.sql`, `097_fix_function_search_path.sql`,
  `098_fix_storage_policy_pool_uploads.sql`, `099_candidate_identity_normalization.sql`
- Decisões: `memory/decisions.md` (DEC-2026-08-05-001/002/003)
- Erros conhecidos: `memory/errors.md` (ERR-2026-08-05-001/002/003/004/005)
- Fluxos no código:
  - `src/pages/vagas/VagaCandidatos.tsx` (gestão da vaga, análise, batch, transferência)
  - `src/pages/vagas/PoolTalentos.tsx` (pool, Match em lote, pré-análise)
  - `src/features/candidates/components/PoolAddCandidate.tsx` (fluxo 3)
  - `src/features/candidates/components/TalentTransferModal.tsx` (vaga→banco)
  - `src/features/candidates/components/ReanalyzeCandidateModal.tsx` (reanálise no banco)
  - `src/pages/candidates/CandidateBank.tsx` (banco: lista, enrich, excluir)
  - `src/features/analysis/CandidatePanel.tsx` + `CandidatePanelUtils.ts` (render)
  - `src/core/services/cvAnalyzer.ts` (analyzeSingleCandidate, batchMatchToJob, analyzeResumeGeneral)
  - `src/core/services/jobAnalyzer.ts` (job-matching)
  - `supabase/functions/openai-proxy/` (prompts scoring/extraction/resume/batch)
  - `supabase/functions/_shared/public-contracts.ts` (inserts do portal)
