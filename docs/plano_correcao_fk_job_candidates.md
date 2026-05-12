# Plano de Correção: Erro FK ao transferir candidato para Banco de Talentos

## Contexto do Problema

Existem **dois sistemas independentes** que compartilham a tabela `candidates` (Banco de Talentos):

```
SISTEMA ANÁLISES (antigo)                 SISTEMA VAGAS/PIPELINE (novo)
─────────────────────────                 ───────────────────────────────────

jobs                                          vagas_white_label
  │                                             │
  │ ── job_candidates ──┐                      vagas_candidaturas
  │        │            │                        │
  │        │            │                        │
  └────────┼────────────┼────────────────────────┘
           │            │
           ▼            ▼
       job_id         vaga_id
       (FK→jobs)    (FK→vagas_white_label)
           │            │
           └─────┬──────┘
                 ▼
           candidates
        (Banco de Talentos)
```

### O erro

Quando um candidato do **sistema novo** (Vagas/Pipeline) é transferido para o Banco de Talentos via `TalentTransferModal`:

```typescript
// Linha 310 do TalentTransferModal.tsx
job_id: job.id,   // ERRO: job.id é de vagas_white_label, FK espera jobs(id)
```

O `job_id` recebe o UUID de `vagas_white_label`, mas a FK `job_candidates_job_id_fkey` aponta para `jobs(id)`. Como o UUID não existe em `jobs`, o PostgreSQL rejeita a inserção.

---

## Arquivos que precisam de alteração

| # | Arquivo | O que fazer | Risco |
|---|---------|-------------|-------|
| 1 | `TalentTransferModal.tsx` | Remover `job_id` do upsert em `job_candidates` | 🟢 Nenhum |
| 2 | `CandidatePanel.tsx` | Remover fallback `'banco'` | 🟢 Nenhum |
| 3 | `Pipeline.tsx` | Adicionar `vaga_id` no select e filtros de histórico | 🟢 Baixo |
| 4 | `CandidateBank.tsx` | Já tem `vaga_id` no validJobIds; corrigir filtro de history | 🟢 Baixo |

---

## Passo a Passo

### Passo 1: `TalentTransferModal.tsx` — Remover `job_id` do upsert

**Arquivo:** `src/features/candidates/components/TalentTransferModal.tsx`
**Linha:** 310

**Antes (linhas 304-314):**
```typescript
// 1.5. Vincular à vaga no Banco de Talentos (tabela job_candidates)
const { error: jcError } = await supabase
    .from('job_candidates')
    .upsert({
        candidate_id: dbCandidate.id,
        vaga_id: job.id,
        job_id: job.id,          // ← REMOVER esta linha
        user_id: profile.userId,
        score: candidate.match_score || 0,
        status: 'Banco de Talentos'
    }, { onConflict: 'candidate_id,vaga_id' });
```

**Depois:**
```typescript
// 1.5. Vincular à vaga no Banco de Talentos (tabela job_candidates)
const { error: jcError } = await supabase
    .from('job_candidates')
    .upsert({
        candidate_id: dbCandidate.id,
        vaga_id: job.id,
        user_id: profile.userId,
        score: candidate.match_score || 0,
        status: 'Banco de Talentos'
    }, { onConflict: 'candidate_id,vaga_id' });
```

**O que acontece:** O `job_id` não é enviado → PostgreSQL deixa como NULL → FK não é violada.
**Por que é seguro:** `job_id` é usado pelo sistema Análises (antigo). Esse modal só é chamado pelo sistema Vagas (novo).

**Atenção:** Na linha 218 (`analysisData`), o `job_id: job.id` **deve permanecer** — ele é usado dentro do JSON `analysis.history` em `candidates`, não na tabela `job_candidates`. É apenas metadado para rastrear qual vaga gerou aquela análise.

---

### Passo 2: `CandidatePanel.tsx` — Remover fallback `'banco'`

**Arquivo:** `src/features/analysis/CandidatePanel.tsx`
**Linha:** 1117

**Antes:**
```typescript
id: currentJobContext?.id || c.applications[0]?.jobId || 'banco',
```

**Depois:**
```typescript
id: currentJobContext?.id || c.applications[0]?.jobId,
```

**O que acontece:** Quando não há contexto de vaga, `id` fica `undefined` em vez de `'banco'`.
**Por que é seguro:** Se `id` for `undefined`, o modal não tenta fazer upsert com um UUID inválido.

---

### Passo 3: `Pipeline.tsx` — Adicionar `vaga_id` nos selects e filtros

**Arquivo:** `src/pages/candidates/Pipeline.tsx`

**3a. Adicionar `vaga_id` no select** (linha 743)

**Antes:**
```typescript
supabase.from('job_candidates').select('job_id').eq('candidate_id', id),
```

**Depois:**
```typescript
supabase.from('job_candidates').select('job_id, vaga_id').eq('candidate_id', id),
```

**3b. Atualizar validJobIds e validHistory** (linhas 751-753)

**Antes:**
```typescript
const validJobIds = new Set((jcData ?? []).map((jc: any) => jc.job_id));
const rawHistory: any[] = analysis?.history ?? [];
const validHistory = rawHistory.filter((h: any) => h.job_id && validJobIds.has(h.job_id));
```

**Depois:**
```typescript
const validJobIds = new Set(
    (jcData ?? []).flatMap((jc: any) => [jc.job_id, jc.vaga_id].filter(Boolean))
);
const rawHistory: any[] = analysis?.history ?? [];
const validHistory = rawHistory.filter((h: any) => 
    (h.job_id || h.vaga_id) && validJobIds.has(h.job_id || h.vaga_id)
);
```

**O que acontece:** Candidatos transferidos do sistema Vagas agora também são encontrados no histórico.
**Por que é seguro:** Apenas adiciona `vaga_id` como alternativa — `job_id` continua funcionando normalmente para o sistema antigo.

---

### Passo 4: `CandidateBank.tsx` — Corrigir filtro de histórico

**Arquivo:** `src/pages/candidates/CandidateBank.tsx`

**Observação:** A linha 318 já tem `if (jc.vaga_id) validJobIds.add(jc.vaga_id)` — isso já foi corrigido anteriormente. Só precisa corrigir o filtro do `history`.

**Corrigir filtro de histórico** (linha 328)

**Antes:**
```typescript
const validHistory = rawHistory.filter((h: any) => h.job_id);
```

**Depois:**
```typescript
const validHistory = rawHistory.filter((h: any) => h.job_id || h.vaga_id);
```

**O que acontece:** O histórico do candidato é carregado mesmo quando a vaga foi registrada via `vaga_id`.
**Por que é seguro:** Apenas adiciona `h.vaga_id` como alternativa ao `h.job_id`.

---

## O que NÃO precisa ser alterado

| Arquivo | Motivo |
|---------|--------|
| `AnalysisContext.tsx` (linhas 492-497) | Upsert do sistema Análises com `job_id` → `jobs.id` ✓ Correto. O `onConflict: 'candidate_id,job_id'` é um bug pre-existente mas não causa erro prático porque a UNIQUE real é `(candidate_id, vaga_id)` e o sistema antigo não usa `vaga_id`. |
| `Analises.tsx` (linha 173) | `.eq('job_id', jobId)` — Filtra apenas registros do sistema Análises. Correto. |
| `Dashboard.tsx` (linha 262) | `.in('job_id', ids)` — Estatísticas do sistema Análises. Não deve incluir registros do sistema Vagas. |
| `aiTools.tsx` (linhas 24, 40) | JOIN com `jobs` — só sistema Análises. Correto. |
| `TalentTransferModal.tsx` (linha 218) | `job_id: job.id` no `analysisData` — é metadado do JSON `analysis.history`, não FK. **Não remover.** |
| `TalentTransferModal.tsx` (linha 359) | `selected_job_id: job.id` — é metadado nas notas do pipeline card. **Não remover.** |

---

## Ordem de Implementação

```
1. CandidateBank.tsx  → 1 alteração (menor risco)
2. Pipeline.tsx       → 2 alterações (seguem o mesmo padrão)
3. TalentTransferModal.tsx → 1 alteração (remove job_id do upsert)
4. CandidatePanel.tsx → 1 alteração (remove fallback 'banco')
```

---

## Como testar após implementar

### 1. Build
```bash
npm run build
```
Não deve mostrar erros de TypeScript (apenas os pré-existentes em outros arquivos).

### 2. Teste funcional — Transferência sem erro

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1 | Abrir uma vaga em Vagas | Página de candidatos da vaga |
| 2 | Clicar em "Mover para Banco de Talentos" em um candidato | Modal abre |
| 3 | Clicar em "Apenas Mover" | ✅ Sem erro de FK. Toast de sucesso. |
| 4 | Ir para Banco de Talentos | ✅ Candidato aparece na lista |
| 5 | Clicar no candidato | ✅ Painel abre com dados e histórico carregado |

### 3. Teste de regressão — Sistema Análises continua funcionando

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1 | Ir em Análises | Lista de análises carrega |
| 2 | Abrir uma análise existente | Candidatos aparecem normalmente |
| 3 | Verificar histórico de candidato | Histórico carregado corretamente |

### 4. Teste de regressão — Pipeline continua funcionando

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1 | Ir em Pipeline | Lista de pipelines carrega |
| 2 | Abrir um pipeline | Cards dos candidatos aparecem |
| 3 | Abrir detalhes de um candidato | Histórico carregado corretamente |

---

## Se algo der errado

### Rollback das alterações:

Cada arquivo pode ser revertido individualmente:

```bash
# Reverter um arquivo específico
git checkout -- src/features/candidates/components/TalentTransferModal.tsx
git checkout -- src/features/analysis/CandidatePanel.tsx
git checkout -- src/pages/candidates/Pipeline.tsx
git checkout -- src/pages/candidates/CandidateBank.tsx
```

### Se o erro de FK persistir:

Verificar se a coluna `job_id` em `job_candidates` permite NULL:

```sql
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'job_candidates' AND column_name = 'job_id';
```

Se for `NOT NULL`, rodar:

```sql
ALTER TABLE job_candidates ALTER COLUMN job_id DROP NOT NULL;
```

---

## Resumo das mudanças (só o que importa)

```diff
- talentTransferModal.tsx:310:      job_id: job.id,         ← REMOVER
- candidatePanel.tsx:1117:          || 'banco'              ← REMOVER
- pipeline.tsx:743:                 .select('job_id')       ← .select('job_id, vaga_id')
- pipeline.tsx:751:                 map((jc) => jc.job_id)  ← flatMap([jc.job_id, jc.vaga_id])
- pipeline.tsx:753:                 h.job_id && validJobIds.has(h.job_id)  ← (h.job_id||h.vaga_id) && validJobIds.has(h.job_id||h.vaga_id)
+ candidateBank.tsx:328:            h.job_id                ← h.job_id || h.vaga_id (já tem vaga_id no validJobIds)
```

**Total: 6 alterações em 4 arquivos.**
