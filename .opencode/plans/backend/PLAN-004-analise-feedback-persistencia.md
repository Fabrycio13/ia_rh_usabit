# PLAN-004: Correção da persistência e exibição do feedback da análise

## Problema

Quando um candidato se cadastra via formulário público (`JobApplication.tsx`) ou é
analisado internamente (`AnaliseNova.tsx`), o feedback da IA está sendo salvo de
forma incompleta no banco e/ou não chega corretamente ao `CandidatePanel` para
exibição. Resultado: apenas o score aparece no painel lateral; o texto da análise,
pontos positivos e pontos de atenção ficam em branco.

## Causa raiz

### 1. `c.analysis` nunca chega ao CandidatePanel

**Caminho A — VagaCandidatos.tsx (candidatura pública):**

```ts
// linha 176-177
const aiRaw = (c.ai_analysis ?? {});          // {} sempre — coluna não existe no banco
const aiFromAnswers = answersRaw['_ai_analysis']; // TEM os dados reais

// linha 206 — aiRaw vence: c.analysis vira {}
analysis: aiRaw || aiFromAnswers || null,
```

**Caminho B — Analises.tsx (análise interna):**

A função `enrichCandidate` (~linha 293-325) extrai `skills`, `experience`,
`redFlags` como campos planos do `CandidateDetail`, mas **não retorna o objeto
`analysis` bruto**. Então `c.analysis` fica `undefined`.

### 2. Dados salvos são incompletos

Em `AnalysisContext.tsx:328-337`, o `analysisData` salvo no banco só contém:

```ts
{ skills, experience, education, redFlags, score, job_id, job_name, analyzed_at }
```

Campos que a IA retorna mas **não são persistidos**: `summary`, `strengths[]`,
`gaps[]`, `classification`, `recommendation`.

Em `JobApplication.tsx:884-901` os nomes dos campos salvos também estão
desalinhados (ex: `experience` guarda `aiResult.summary`).

## Plano de correção

### 1. `src/core/contexts/AnalysisContext.tsx` — Expandir `analysisData`

No callback `onCandidateProcessed`:

- `experience` passa a receber `c.experience` (tempo de experiência real)
- `summary` recebe `c.summary` separadamente
- `strengths[]`, `gaps[]`, `classification`, `recommendation` são extraídos do
  resultado da IA e incluídos no `normalizedCandidate` e no `analysisData`
- Score permanece **único** (`score`), sem sub-scores

Estrutura final do `analysisData`:

```ts
{
  skills, experience, education,
  redFlags: normalizedCandidate.attention_points,
  summary, strengths, gaps,
  classification, recommendation,
  score, job_id, job_name, analyzed_at
}
```

### 2. `src/pages/analysis/Analises.tsx` — Retornar `analysis` no enrichCandidate

Adicionar no objeto de retorno da função `enrichCandidate` (~linha 324):

```ts
analysis: cand.analysis || {},
```

### 3. `src/pages/vagas/VagaCandidatos.tsx` — Inverter prioridade

Linha 206, trocar:

```ts
analysis: aiRaw || aiFromAnswers || null,
```

para:

```ts
analysis: aiFromAnswers || aiRaw || null,
```

Isso faz `c.analysis` apontar para os dados reais do `_ai_analysis`.

### 4. `src/pages/vagas/JobApplication.tsx` — Alinhar campos do upsert

No `candidates.upsert` (~linha 884-901), substituir o objeto `analysis` por:

```ts
analysis: aiResult ? {
  skills: aiResult.skills?.join(', '),
  experience: aiResult.experience,
  education: aiResult.education,
  summary: aiResult.summary,
  classification: aiResult.classification,
  strengths: aiResult.strengths,
  gaps: aiResult.gaps,
  history: [{
    job_id: job!.id,
    job_title: job!.title,
    score: aiResult.score,
    date: new Date().toISOString(),
    classification: aiResult.classification,
    summary: aiResult.summary,
    skills: aiResult.skills?.join(', '),
    experience: aiResult.experience,
    education: aiResult.education,
    strengths: aiResult.strengths,
    gaps: aiResult.gaps,
  }]
} : null
```

### 5. Nenhuma alteração em `CandidatePanel.tsx`

O painel já possui fallback que percorre múltiplos nomes de campo
ex: `summary || experience`, `strengths || positivePoints`,
`redFlags || gaps`. Com `c.analysis` corretamente populado e os campos
certos no banco, a seção "Feedback da IA" passa a renderizar.

## Backward compatibility

- Registros antigos no banco não terão `summary`, `strengths`, `gaps`,
  `classification`, `recommendation`.
- O `CandidatePanel` já trata esses campos como opcionais (fallbacks).
- A experiência antiga (texto da análise e redFlags) continua funcionando
  pelos fallbacks existentes.
- Novos registros terão os campos completos e serão exibidos com prioridade.

## Arquivos alterados

| Arquivo | Tipo de mudança |
|---------|----------------|
| `src/core/contexts/AnalysisContext.tsx` | Expandir `analysisData` e mapeamento |
| `src/pages/analysis/Analises.tsx` | Adicionar `analysis` ao retorno |
| `src/pages/vagas/VagaCandidatos.tsx` | Inverter prioridade `aiFromAnswers` |
| `src/pages/vagas/JobApplication.tsx` | Alinhar campos do `analysis` upsert |
| `src/features/analysis/CandidatePanel.tsx` | Nenhuma |
