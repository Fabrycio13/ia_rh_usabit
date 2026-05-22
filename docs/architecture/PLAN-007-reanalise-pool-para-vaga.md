# PLAN-007: Reanálise de Candidato do Pool para Vaga Específica

**Versão:** 1.0.0
**Data:** 2026-05-20
**Branch:** `fix/remediation-sprint`
**Dependências:** PLAN-006 (Pool de Talentos + Candidatura Espontânea)

---

## 1. Problema

O `PoolTalentos.tsx` tentava filtrar por `.is('vaga_id', null)` na tabela `candidates`, mas essa coluna **não existe** nessa tabela — `vaga_id` só existe em `vagas_candidaturas` e `job_candidates`.

Erro:
```
column candidates.vaga_id does not exist (código 42703)
```

---

## 2. Objetivo

Permitir que o RH selecione um candidato do **Pool de Talentos** (candidatura espontânea), re-analise o currículo contra uma **vaga específica**, e promova o candidato para aquela vaga — com novo score, nova análise da IA, e fluxo normal de candidatura.

---

## 3. Fluxo Completo

```
Pool de Talentos
  └─ query: candidates.filter('analysis->>source', 'eq', 'spontaneous')
       │
       └─ RH clica candidato → CandidatePanel abre
            │ (com showAnalyzeWithVagas={true})
            │
            ├─ Botão "Mover para Banco de Talentos" (já existe)
            │
            └─ NOVO: Botão "Analisar com Vagas"
                 │
                 └─ Dispara callback: onAnalyzeWithVagas(candidateId)
                      │
                      └─ PoolTalentos abre modal:
                           ┌──────────────────────────────────────────┐
                           │  Selecionar vaga para reanálise          │
                           │                                          │
                           │  Buscar... [_____________________]        │
                           │                                          │
                           │  ○ Design (12 candidatos)   ● Ativa     │
                           │  ○ Desenvolvimento (8)      ● Invisível │
                           │  ○ Marketing (3)            ● Ativa     │
                           │  ...                                    │
                           │                                          │
                           │         [Cancelar]  [Analisar]           │
                           └──────────────────────────────────────────┘
                           │
                           1. Fetch vagas_white_label WHERE org_id = X
                           2. RH seleciona vaga
                           3. Clique em [Analisar]
                           4. Loading state
                           5. Download CV do storage
                           6. IA: analyzeJobApplication(resume, vaga)
                           7. Insert vagas_candidaturas (status 'reviewed')
                           8. Upsert job_candidates (score, status)
                           9. Update candidates.analysis:
                              → source: 'transferred'
                              → vaga_id, score, match_rationale
                              → adiciona no history[]
                          10. Refresh Pool → candidato some
                          11. Candidato aparece em VagaCandidatos
```

---

## 4. O que muda no Banco de Dados

**Zero migrações.** Usa colunas e tabelas existentes:

| Tabela | Operação | Detalhes |
|---|---|---|
| `candidates` | **UPDATE** | `analysis` JSONB: muda `source` de `'spontaneous'` para `'transferred'`, adiciona dados da vaga + histórico |
| `vagas_candidaturas` | **INSERT** | Novo registro com `status: 'reviewed'`, `match_score`, `source: 'transferred_from_pool'`, `answers._ai_analysis` com análise da IA |
| `job_candidates` | **UPSERT** | Link `candidate_id` + `vaga_id` com novo `score` e `status: 'reviewed'` |

### Estrutura do `analysis` após reanálise

```json
{
  "source": "transferred",
  "vaga_id": "uuid-da-vaga",
  "vaga_title": "Design",
  "score": 78,
  "match_rationale": "Candidato possui 5 anos de experiência...",
  "skills": ["Figma", "Adobe XD", "UI Design"],
  "experience": "5 anos em design digital",
  "strengths": ["Portfólio robusto", "Experiência internacional"],
  "gaps": ["Sem certificação específica"],
  "history": [
    {
      "type": "spontaneous",
      "date": "2026-05-15T10:00:00Z",
      "skills": [...],
      "experience": "...",
      "summary": "..."
    },
    {
      "type": "reanalysis",
      "vaga_id": "uuid-da-vaga",
      "vaga_title": "Design",
      "date": "2026-05-20T14:30:00Z",
      "score": 78,
      "match_rationale": "...",
      "skills": [...],
      "strengths": [...],
      "gaps": [...]
    }
  ]
}
```

---

## 5. Arquivos Modificados

### 5.1. `src/pages/vagas/PoolTalentos.tsx`

| O quê | Detalhe |
|---|---|
| **Fix query** | Linhas 78, 165: `.is('vaga_id', null)` → `.filter('analysis->>source', 'eq', 'spontaneous')` |
| **Novo prop no CandidatePanel** | Passar `showAnalyzeWithVagas={true}` e `onAnalyzeWithVagas={handle}` |
| **Modal de seleção de vagas** | Estado `analyzingCandidate: Candidate \| null`, modal lista vagas com busca |
| **Fluxo IA** | Download CV → `analyzeJobApplication` → insert/update no banco |
| **Loading state** | Durante análise, botão disabled com loader |

### 5.2. `src/features/analysis/CandidatePanel.tsx`

| O quê | Detalhe |
|---|---|
| **Novo prop** | `showAnalyzeWithVagas?: boolean` (default false) |
| **Novo prop** | `onAnalyzeWithVagas?: (candidateId: string) => void` |
| **Botão condicional** | Na área inferior, acima de "Mover para Banco de Talentos", renderizado apenas quando `showAnalyzeWithVagas` é true |

### 5.3. `src/core/services/analyzers/resumeAnalyzer.ts` (se necessário)

Caso `analyzeJobApplication` precise de adaptação para receber texto já extraído (evitar re-extrair PDF), ajustar assinatura. Por ora, reutiliza `analyzeJobApplication` do `jobAnalyzer.ts` passando o `File` baixado do storage.

---

## 6. Detalhes de Implementação

### 6.1. Download do CV do Storage

Como `resume_url` é uma URL pública ou assinada, precisamos fazer `fetch(url)` → `blob()` → `File`:

```typescript
async function downloadResume(url: string, fileName: string): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type });
}
```

### 6.2. Chama IA

```typescript
import { analyzeJobApplication } from '../../core/services/analyzers/jobAnalyzer';

const resumeFile = await downloadResume(c.resume_url!, c.resume_file_name || 'curriculo.pdf');
const result = await analyzeJobApplication(resumeFile, vaga.title, vaga.description || '');
// result: { score, match_rationale, skills, experience, strengths, gaps, ... }
```

### 6.3. Insert vagas_candidaturas

```typescript
await supabase.from('vagas_candidaturas').insert({
  vaga_id: vaga.id,
  organization_id: profile.organization_id,
  candidate_name: c.name,
  candidate_email: c.email,
  candidate_phone: c.phone,
  candidate_location: c.location,
  candidate_linkedin: c.linkedin,
  candidate_gender: c.gender,
  candidate_age: c.age,
  resume_url: c.resume_url,
  resume_file_name: c.resume_file_name,
  status: 'reviewed',
  match_score: result.score,
  source: 'transferred_from_pool',
  answers: { _ai_analysis: result }
});
```

### 6.4. Upsert job_candidates

```typescript
await supabase.from('job_candidates').upsert({
  candidate_id: c.id,
  vaga_id: vaga.id,
  user_id: profile.userId,
  score: result.score,
  status: 'reviewed'
}, { onConflict: 'candidate_id,vaga_id' });
```

### 6.5. Update candidates.analysis

```typescript
const newAnalysis = {
  source: 'transferred',
  vaga_id: vaga.id,
  vaga_title: vaga.title,
  score: result.score,
  match_rationale: result.match_rationale || result.summary,
  skills: result.skills,
  experience: result.experience,
  strengths: result.strengths,
  gaps: result.gaps,
  history: [
    ...(c.analysis?.history || [{
      type: 'spontaneous',
      date: c.created_at,
      summary: c.analysis?.summary,
      skills: c.analysis?.skills,
      experience: c.analysis?.experience,
      education: c.analysis?.education,
      strengths: c.analysis?.strengths,
      gaps: c.analysis?.gaps
    }]),
    {
      type: 'reanalysis',
      vaga_id: vaga.id,
      vaga_title: vaga.title,
      date: new Date().toISOString(),
      score: result.score,
      match_rationale: result.match_rationale,
      skills: result.skills,
      experience: result.experience,
      strengths: result.strengths,
      gaps: result.gaps
    }
  ]
};

await supabase.from('candidates').update({ analysis: newAnalysis }).eq('id', c.id);
```

---

## 7. O que NÃO muda

- `SpontaneousApplication.tsx` — intacto
- `TalentTransferModal.tsx` — intacto
- `VagaCandidatos.tsx` — intacto (já mostra via `vagas_candidaturas`)
- `JobApplication.tsx` — intacto
- `PublicJobPage.tsx` — intacto
- `OrganizationCareerPage.tsx` — intacto
- `CareerPortalHub.tsx` — intacto (só importa PoolTalentos)
- Nenhuma migration, nenhuma coluna nova

---

## 8. Etapas de Implementação

### Passo 1 — Fix PoolTalentos.tsx

Trocar `.is('vaga_id', null)` por `.filter('analysis->>source', 'eq', 'spontaneous')` nos 2 lugares (linhas 78, 165).

**Validar:** `npx tsc --noEmit`

### Passo 2 — CandidatePanel.tsx

Adicionar props:
```typescript
showAnalyzeWithVagas?: boolean;
onAnalyzeWithVagas?: (candidateId: string) => void;
```

Renderizar botão "Analisar com Vagas" na área inferior (condicional).

### Passo 3 — PoolTalentos.tsx (modal + fluxo IA)

Adicionar:
- Estado `analyzingCandidate`
- Modal de seleção de vagas (fetch `vagas_white_label`, grid com busca)
- Função `handleAnalyzeWithVagas(candidateId)`: download CV → IA → inserts
- Passar `showAnalyzeWithVagas` e `onAnalyzeWithVagas` ao CandidatePanel
- Toast de sucesso/erro

**Validar:** `npx tsc --noEmit` + `npm run build`

---

## 9. Validação Final

```powershell
npx tsc --noEmit        # zero erros
npm run build           # build bem-sucedido
```

---

## 10. Riscos

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| CV não encontrado no storage | Baixa | Alto | Tratar com try/catch, toast de erro |
| IA falhar na reanálise | Média | Médio | Fallback: criar candidatura sem IA (status 'pending') |
| Candidato duplicado na vaga | Baixa | Baixo | `job_candidates` usa `ON CONFLICT` → upsert seguro |
| Modal sem vagas disponíveis | Baixa | Baixo | Exibir mensagem "Nenhuma vaga disponível" |
