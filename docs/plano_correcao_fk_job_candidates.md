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

| # | Arquivo | O que fazer | Risco | Status |
|---|---------|-------------|-------|--------|
| 0 | `supabase/migrations/054_*.sql` | Migration: job_id nullable + UNIQUE (candidate_id, job_id) | 🟡 Médio | ⏳ Pendente |
| 1 | `TalentTransferModal.tsx` | Remover `job_id` do upsert em `job_candidates` | 🟢 Nenhum | ⏳ Pendente |
| 2 | `CandidatePanel.tsx` | Remover fallback `'banco'` e validar UUID antes de abrir modal | 🟢 Baixo | ⏳ Pendente |
| 3 | `Pipeline.tsx` | Adicionar `vaga_id` no select e filtros de histórico | 🟢 Baixo | ⏳ Pendente |
| 4 | `CandidateBank.tsx` | Corrigir filtro de history para usar `validJobIds.has()` igual Pipeline | 🟢 Baixo | ⏳ Pendente |
| 5 | `Analises.tsx` | Adicionar `hideBankButton: true` no enrichCandidate | 🟢 Nenhum | ⏳ Pendente |

**Total: 1 migration + 6 arquivos modificados**

---

## Pré-requisito (Passo 0)

### Passo 0: Verificar/garantir que `job_candidates.job_id` aceita NULL

**Se pular este passo**, a remoção do `job_id` no Passo 1 causará: `null value in column "job_id" violates not-null constraint`.

```sql
-- 0a. Verificar se a coluna permite NULL
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'job_candidates' AND column_name = 'job_id';
```

Se for `NOT NULL`:

```sql
-- 0b. Migration: tornar a coluna nullable
ALTER TABLE job_candidates ALTER COLUMN job_id DROP NOT NULL;

-- 0c. Confirmar
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'job_candidates' AND column_name = 'job_id';
-- Deve retornar is_nullable = 'YES'
```

### Passo 0 (extra): Verificar constraints UNIQUE para ambos sistemas

O `AnalysisContext.tsx` (linha 497) faz upsert com `onConflict: 'candidate_id,job_id'`. Isso **requer** uma constraint UNIQUE em `(candidate_id, job_id)`. A migration `050` só adicionou `UNIQUE (candidate_id, vaga_id)` — se a constraint antiga não existir, o upsert do sistema Análises **quebra**.

```sql
-- Verificar todas as constraints UNIQUE na tabela
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'job_candidates'
  AND constraint_type = 'UNIQUE';
```

**Resultado esperado:**
| constraint_name | constraint_type |
|-----------------|-----------------|
| job_candidates_candidate_vaga_key | UNIQUE |
| job_candidates_candidate_job_key | UNIQUE |

Se **não existir** `job_candidates_candidate_job_key`:

```sql
-- Migration: adicionar UNIQUE (candidate_id, job_id) para o sistema Análises
ALTER TABLE job_candidates ADD CONSTRAINT job_candidates_candidate_job_key UNIQUE (candidate_id, job_id);
```

**⚠️ Atenção — dedup antes de criar UNIQUE:** Se existirem duplicatas de `(candidate_id, job_id)`, o `ADD CONSTRAINT` falha. Incluir na migration:

```sql
-- Remover duplicatas antes de criar UNIQUE (candidate_id, job_id)
DELETE FROM job_candidates a USING (
  SELECT MIN(ctid) as ctid, candidate_id, job_id
  FROM job_candidates
  WHERE job_id IS NOT NULL
  GROUP BY candidate_id, job_id HAVING COUNT(*) > 1
) b
WHERE a.candidate_id = b.candidate_id
  AND a.job_id IS NOT NULL
  AND b.job_id IS NOT NULL
  AND a.job_id = b.job_id
  AND a.ctid <> b.ctid;
```

**⚠️ Concern sobre `vaga_id` no UNIQUE constraint:**

A migration `050` adicionou UNIQUE em `(candidate_id, vaga_id)`. Quando o fluxo de transferência move um candidato para Banco de Talentos, ele insere com `vaga_id = job.id` (que é um `vagas_white_label.id`).

**Cenário担心的**: Se o mesmo candidato for transferido para Banco de Talentos a partir de **duas vagas diferentes** do sistema Vagas:
1. Primeira transferência: `vaga_id = vaga1.id` → OK
2. Segunda transferência: `vaga_id = vaga2.id` → OK (vaga_id diferente)

**Conclusão**: O UNIQUE em `(candidate_id, vaga_id)` **não conflita** porque cada vaga tem ID diferente. O upsert com `onConflict: 'candidate_id,vaga_id'` tratado pelo plano é suficiente.

---

### ⚠️ Pre-existing bug: Analises.tsx passa `jobs.id` como `vaga_id`

**Isso NÃO é causado pelo plano, mas é importante documentar:**

O `Analises.tsx` tem seu próprio `enrichCandidate` (linha 245) que popula `applications` com `jobId: h.job_id` — onde `h.job_id` é um `jobs.id` (sistema Análises antigo).

Quando o usuário abre um candidato na página **Análises** e clica em "Mover para Banco de Talentos":

1. `currentJobContext` **não é passado** (Analises.tsx linha 564)
2. `c.applications[0]?.jobId` é um `jobs.id`
3. `vaga_id: job.id` = um `jobs.id` → **FK violation** (`vaga_id` espera `vagas_white_label.id`)

**Isso já acontece hoje** — o bug existe no código atual, independente deste plano.

**Solução recomendada (fora do escopo principal, mas fácil de aplicar):**

No `Analises.tsx`, função `enrichCandidate`, o trecho que monta o `CandidateDetail` não inclui `hideBankButton`. Como o sistema Análises trabalha com `jobs` (não com `vagas_white_label`), o botão não deveria estar disponível. Adicionar:

```typescript
// Analises.tsx — dentro do return de enrichCandidate (~linha 273)
return {
  ...
  hideBankButton: true,   // ← ADICIONAR
  enriched: true,
  ...
};
```

**Se não for feita essa correção**, o fluxo de Análises continuará quebrado como já está hoje — nada muda com ou sem este plano.

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

### Passo 2: `CandidatePanel.tsx` — Remover fallback `'banco'` e validar UUID

**Arquivo:** `src/features/analysis/CandidatePanel.tsx`
**Linha:** 1117

**Problema adicional identificado:** Quando `currentJobContext?.id` e `c.applications[0]?.jobId` são ambos `undefined`, `job.id` vira `undefined` e o modal cria um registro órfão em `job_candidates` com `vaga_id = NULL`. O botão não deveria aparecer quando não há contexto de vaga válido.

**Antes:**
```typescript
                    job={{
                        id: currentJobContext?.id || c.applications[0]?.jobId || 'banco',
                        title: currentJobContext?.title || c.applications[0]?.jobName || 'Banco de Talentos',
                        organization_id: profile.organization_id
                    }}
```

**Depois:**
```typescript
                    job={{
                        id: currentJobContext?.id || c.applications[0]?.jobId,
                        title: currentJobContext?.title || c.applications[0]?.jobName || 'Banco de Talentos',
                        organization_id: profile.organization_id
                    }}
```

**E também:** Envolver o botão "Mover para Banco de Talentos" com validação de UUID:

**Antes (linha 1062):**
```tsx
{!c.hideBankButton && c.status !== 'talent_bank' && (
    <div style={{ padding: '0 24px 32px' }}>
        <button ...>
```

**Depois:**
```tsx
{!c.hideBankButton && c.status !== 'talent_bank' && (
    currentJobContext?.id || c.applications[0]?.jobId ? (
        <div style={{ padding: '0 24px 32px' }}>
            <button ...>
        </div>
    ) : null
)}
```

**O que acontece:**
1. `id` fica `undefined` em vez de `'banco'` → `vaga_id: undefined` vira NULL no BD, o que é seguro pois a FK `vaga_id` permite NULL.
2. O botão de transferir não é renderizado se não houver um UUID de vaga válido → evita registro órfão.

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

**Depois (usando forEach para consistência com CandidateBank):**
```typescript
const validJobIds = new Set();
(jcData ?? []).forEach((jc: any) => {
    if (jc.job_id) validJobIds.add(jc.job_id);
    if (jc.vaga_id) validJobIds.add(jc.vaga_id);
});
const rawHistory: any[] = analysis?.history ?? [];
const validHistory = rawHistory.filter((h: any) =>
    (h.job_id || h.vaga_id) && validJobIds.has(h.job_id || h.vaga_id)
);
```

**O que acontece:** Candidatos transferidos do sistema Vagas agora também são encontrados no histórico.
**Por que é seguro:** Apenas adiciona `vaga_id` como alternativa — `job_id` continua funcionando normalmente para o sistema antigo.
**Por que usar `forEach` em vez de `flatMap`:** Mantém consistência com o padrão usado em `CandidateBank.tsx`, que é mais legível e explícito.

---

### Passo 4: `CandidateBank.tsx` — Corrigir filtro de histórico com validação contra validJobIds

**Arquivo:** `src/pages/candidates/CandidateBank.tsx`

**Observação:** A linha 318 já tem `if (jc.vaga_id) validJobIds.add(jc.vaga_id)` — isso já foi corrigido anteriormente.

**Problema identificado:** `validJobIds` já contém `job_id` e `vaga_id`, mas o filtro de history não valida contra ele (só verifica existência de `h.job_id`). O `Pipeline.tsx` faz essa validação extra, criando inconsistência.

**Antes (linha 328):**
```typescript
const validHistory = rawHistory.filter((h: any) => h.job_id);
```

**Depois:**
```typescript
const validHistory = rawHistory.filter((h: any) =>
    (h.job_id || h.vaga_id) && validJobIds.has(h.job_id || h.vaga_id)
);
```

**O que acontece:**
1. O filtro agora também aceita `h.vaga_id` (candidatos do sistema Vagas).
2. O filtro valida contra `validJobIds` igual Pipeline faz → histórico mostra apenas registros que ainda têm vínculo em `job_candidates`.
3. Se a vaga foi removida ou o vínculo deletado, o histórico não exibe entrada órfã.

---

### Passo 5: `Analises.tsx` — Adicionar `hideBankButton: true`

**Arquivo:** `src/pages/analysis/Analises.tsx`
**Função:** `enrichCandidate` (~linha 273)

**Problema:** O sistema Análises trabalha com `jobs.id` (antigo), não com `vagas_white_label.id` (novo). Quando o usuário tenta transferir um candidato do Análises, o botão "Mover para Banco de Talentos" tenta usar `vaga_id: jobs.id`, violando a FK.

**Antes (return do enrichCandidate ~linha 273):**
```typescript
return {
  id: c.id,
  name: c.candidate_name,
  email: c.candidate_email,
  phone: c.candidate_phone,
  score: c.match_score,
  vagas: [],
  already_in_pipeline: false,
  is_blacklisted: c.is_blacklisted,
  phone: c.candidate_phone,
  conversations: c.candidate_conversations,
  enriched: true,  // ← hideBankButton NÃO existe aqui
};
```

**Depois:**
```typescript
return {
  id: c.id,
  name: c.candidate_name,
  email: c.candidate_email,
  phone: c.candidate_phone,
  score: c.match_score,
  vagas: [],
  already_in_pipeline: false,
  is_blacklisted: c.is_blacklisted,
  phone: c.candidate_phone,
  conversations: c.candidate_conversations,
  hideBankButton: true,  // ← ADICIONAR: sistema Análises não suporta transferência
  enriched: true,
};
```

**O que acontece:** O botão "Mover para Banco de Talentos" não aparece na interface de Análises.
**Por que é seguro:** O sistema Análises usa `jobs.id` e não tem suporte à transferência — o botão nunca funcionou corretamente nesse contexto.

---

## O que NÃO precisa ser alterado

| Arquivo | Motivo |
|---------|--------|
| `AnalysisContext.tsx` (linhas 492-497) | Upsert do sistema Análises com `job_id` → `jobs.id` ✓ Correto. A constraint `UNIQUE (candidate_id, job_id)` deve ser verificada/garantida pelo **Passo 0 (extra)**. |
| `Analises.tsx` (linha 173) | `.eq('job_id', jobId)` — Filtra apenas registros do sistema Análises. Correto. |
| `Analises.tsx` (linha 218) | `job_id: job.id` no `analysisData` — é metadado do JSON `analysis.history`, não FK. Não remover. |
| `Dashboard.tsx` (linha 262) | `.in('job_id', ids)` — Estatísticas do sistema Análises. Não deve incluir registros do sistema Vagas. |
| `aiTools.tsx` (linhas 24, 40) | JOIN com `jobs` — só sistema Análises. Correto. |
| `TalentTransferModal.tsx` (linha 218) | `job_id: job.id` no `analysisData` — é metadado do JSON `analysis.history`, não FK. **Não remover.** |
| `TalentTransferModal.tsx` (linha 359) | `selected_job_id: job.id` — é metadado nas notas do pipeline card. **Não remover.** |

**Exceção:** `Analises.tsx` linha 273 (enrichCandidate return) — **DEVE ser alterado** para adicionar `hideBankButton: true` (Passo 5).

---

## Ordem de Implementação

```
0. Migration SQL (job_id nullable + UNIQUE (candidate_id, job_id))
1. TalentTransferModal.tsx → Remove job_id do upsert
2. CandidateBank.tsx       → Corrige filtro de history com validJobIds
3. Pipeline.tsx            → Adiciona vaga_id no select e filtros
4. CandidatePanel.tsx      → Remove fallback + esconde botão sem UUID
5. Analises.tsx            → Adiciona hideBankButton: true
6. Executar testes E2E     → Validar fluxo completo
```

**Por que essa ordem:**
- Passo 0 é pré-requisito (sem ele, os passos seguintes podem falhar se `job_id` for NOT NULL ou se AnalysisContext quebrar).
- Passos 1-4 são as correções principais (podem ser testados juntos).
- Passo 5 corrige bug pré-existente (menor impacto, mas previne confusão durante testes).
- Passo 6 valida que tudo funciona junto.

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
| 4 | Executar nova análise em currículo | ✅ Upsert em `job_candidates` funciona (onConflict candidate_id,job_id) |

### 4. Teste de regressão — Pipeline continua funcionando

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1 | Ir em Pipeline | Lista de pipelines carrega |
| 2 | Abrir um pipeline | Cards dos candidatos aparecem |
| 3 | Abrir detalhes de um candidato | Histórico carregado corretamente |

### 5. Teste de borda — CandidatePanel sem contexto de vaga

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1 | Ir em Análises | Lista de análises carrega |
| 2 | Abrir uma análise que tenha candidatos sem `applications[0]` | ✅ Botão "Mover para Banco de Talentos" **não aparece** |
| 3 | Alternativamente, verificar via log que `currentJobContext?.id` é undefined | Modal não é renderizado |

### 6. Verificação da migration SQL

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1 | Rodar `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'job_candidates' AND column_name = 'job_id'` | ✅ `is_nullable = 'YES'` |
| 2 | Rodar `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'job_candidates' AND constraint_type = 'UNIQUE'` | ✅ `job_candidates_candidate_job_key` e `job_candidates_candidate_vaga_key` existem |

---

## Testes Automatizados (E2E)

### Teste: Transferência sem erro de FK

```typescript
// tests/e2e/talentTransfer.spec.ts
describe('Talent Transfer to Bank', () => {
  it('MUST NOT throw FK error when transferring from Vagas system', async ({ page }) => {
    // 1. Login como recrutador
    await page.goto('/login');
    await page.fill('[name="email"]', 'recruiter@empresa.com');
    await page.fill('[name="password"]', 'senha123');
    await page.click('[type="submit"]');

    // 2. Ir para uma vaga
    await page.goto('/vagas');
    await page.click('text=Motorista'); // Nome de uma vaga existente

    // 3. Localizar candidato e clicar em "Mover para Banco de Talentos"
    const candidateRow = page.locator('tr[data-candidate-id]').first();
    await candidateRow.hover();
    await candidateRow.locator('button[title="Mover para Banco de Talentos"]').click();

    // 4. Confirmar transferência
    await page.click('text=Apenas Mover');

    // 5. Verificar sucesso
    await expect(page.locator('text=Candidato movido com sucesso')).toBeVisible();

    // 6. Verificar que não houve erro de FK no console
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('FK')) {
        errors.push(msg.text());
      }
    });

    // 7. Ir ao Banco de Talentos e confirmar presença
    await page.goto('/candidates/bank');
    await expect(page.locator(`text=Motorista`)).toBeVisible();
  });

  it('MUST show error toast when transfer fails', async ({ page }) => {
    // Simular falha forçando erro de rede
    await page.route('**/rest/v1/job_candidates**', route => route.abort());
    // ... resto do teste
  });
});
```

### Teste: Verificação de UNIQUE constraint

```typescript
// tests/integration/jobCandidatesUnique.spec.ts
describe('job_candidates UNIQUE constraints', () => {
  it('MUST allow same candidate in multiple vagas', async () => {
    // Um candidato pode estar em vagas diferentes (vaga_id diferente)
    await createJobCandidate({ candidate_id: c1, vaga_id: v1 });
    await createJobCandidate({ candidate_id: c1, vaga_id: v2 });

    const result = await supabase
      .from('job_candidates')
      .select('*')
      .eq('candidate_id', c1);

    expect(result.data.length).toBe(2); // Duas vagas diferentes
  });

  it('MUST prevent duplicate candidate in same vaga', async () => {
    // Mas não pode ter duplicata na mesma vaga
    await createJobCandidate({ candidate_id: c1, vaga_id: v1 });
    const { error } = await createJobCandidate({ candidate_id: c1, vaga_id: v1 });

    expect(error).toBeDefined();
    expect(error.code).toBe('23505'); // PostgreSQL unique violation
  });

  it('MUST prevent same candidate with same job_id (Análises system)', async () => {
    // Sistema antigo também deve respeitar UNIQUE
    await createJobCandidate({ candidate_id: c1, job_id: j1 });
    const { error } = await createJobCandidate({ candidate_id: c1, job_id: j1 });

    expect(error).toBeDefined();
    expect(error.code).toBe('23505');
  });
});
```

---

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Migration falhar por duplicatas | Média | Deduplicação no Passo 0 com GROUP BY + MIN(ctid) |
| Sistema Análises quebrar se UNIQUE não existir | Baixa | Verificação no Passo 0 (extra) e criação se ausente |
| `vaga_id = NULL` criar registros órfãos | Baixa | Validação de UUID no CandidatePanel + botão não aparece |
| Conflito UNIQUE ao mover candidato já presente na vaga | Baixa | `onConflict: 'candidate_id,vaga_id'` faz upsert, não insert |
| Tentativa de transferência no sistema Análises (bug pré-existente) | Alta | `hideBankButton: true` no enrichCandidate do Analises.tsx |

---

## Melhorias de tipo (opcional, baixa prioridade)

Os filtros usam `as any` para `jc` e `h`. Para evitar futuros erros, considerar tipar:

```typescript
interface JobCandidateRow {
    job_id: string | null;
    vaga_id: string | null;
}

interface HistoryEntry {
    job_id?: string;
    vaga_id?: string;
    [key: string]: any;
}
```

Isso não é necessário para a correção do bug, mas previne regressões futuras.

---

## Correção do Bug Pré-Existente no Analises.tsx

**Problema**: O sistema Análises usa `jobs.id` (não `vagas_white_label.id`). Quando o usuário tenta transferir um candidato do Análises para Banco de Talentos, o `vaga_id` recebe um `jobs.id`, violando a FK.

**Nota**: Este bug **já existe no código atual** e ocorre independentemente deste plano. A correção abaixo é recomendada para evitar confusão durante os testes.

### Correção Sugerida (Analises.tsx)

**Arquivo:** `src/pages/analysis/Analises.tsx`
**Função:** `enrichCandidate` (~linha 273)

```typescript
// ANTES (return do enrichCandidate):
return {
  id: c.id,
  name: c.candidate_name,
  email: c.candidate_email,
  phone: c.candidate_phone,
  // ... outras propriedades
  // hideBankButton NÃO existe aqui
  enriched: true,
};

// DEPOIS:
return {
  id: c.id,
  name: c.candidate_name,
  email: c.candidate_email,
  phone: c.candidate_phone,
  // ... outras propriedades
  hideBankButton: true,  // ← ADICIONAR: sistema Análises não suporta transferência
  enriched: true,
};
```

### Por que adicionar `hideBankButton: true`?

O sistema Análises trabalha com `jobs.id` (antigo) e não com `vagas_white_label.id` (novo). O botão "Mover para Banco de Talentos" só funciona corretamente quando originado do sistema Vagas/Pipeline. Portanto, no contexto de Análises, o botão **não deveria aparecer**.

---

## Se algo der errado

### Rollback das alterações:

Cada arquivo pode ser revertido individualmente:

```bash
# Reverter migration
supabase migration down 054_fix_job_candidates_nullable_and_unique

# Reverter arquivos específicos
git checkout -- src/features/candidates/components/TalentTransferModal.tsx
git checkout -- src/features/analysis/CandidatePanel.tsx
git checkout -- src/pages/candidates/Pipeline.tsx
git checkout -- src/pages/candidates/CandidateBank.tsx
git checkout -- src/pages/analysis/Analises.tsx
```

### Se o erro de FK persistir:

Verificar se a migration do Passo 0 foi aplicada:

```sql
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'job_candidates' AND column_name = 'job_id';
```

Se for `NOT NULL`, rodar:
```sql
ALTER TABLE job_candidates ALTER COLUMN job_id DROP NOT NULL;
```

### Se o sistema Análises parar de salvar candidatos:

```sql
-- Verificar se a UNIQUE (candidate_id, job_id) existe
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'job_candidates' AND constraint_type = 'UNIQUE';

-- Se não existir, criar (com dedup primeiro):
DELETE FROM job_candidates a USING (
  SELECT MIN(ctid) as ctid, candidate_id, job_id
  FROM job_candidates WHERE job_id IS NOT NULL
  GROUP BY candidate_id, job_id HAVING COUNT(*) > 1
) b
WHERE a.candidate_id = b.candidate_id
  AND a.job_id IS NOT NULL AND b.job_id IS NOT NULL
  AND a.job_id = b.job_id AND a.ctid <> b.ctid;

ALTER TABLE job_candidates ADD CONSTRAINT job_candidates_candidate_job_key UNIQUE (candidate_id, job_id);
```

### Se o Analises.tsx apresentar erro de FK ao transferir:

**Nota**: Este bug já foi corrigido no Passo 5. Se após implementar o plano ainda ocorrer:

1. Verificar se `hideBankButton: true` foi adicionado no `enrichCandidate` do Analises.tsx
2. Confirmar que o botão não aparece mais na interface de Análises
3. Se ainda aparecer, verificar se há outro lugar chamando o modal de transferência

---

## Auditoria e Logs (Opcional - Futuras Melhorias)

### Por que adicionar logs?

Quando um candidato é movido para o Banco de Talentos, é importante registrar:
- **Quem** fez a ação (user_id)
- **Quando** ocorreu (timestamp)
- **De onde** veio (vaga original)
- **Qual candidato** foi movido

### Onde implementar

O `TalentTransferModal.tsx` já tem lógica de logging. No passo 1.5 (upsert), adicionar após sucesso:

```typescript
// 1.6. Log de auditoria (após upsert bem-sucedido)
if (!jcError) {
  await logActivity('candidate_transferred_to_bank', {
    candidate_id: dbCandidate.id,
    from_vaga_id: job.id,
    user_id: profile.userId,
    timestamp: new Date().toISOString()
  });
}
```

**Tabela sugerida** (se não existir):
```sql
CREATE TABLE IF NOT EXISTS candidate_transfer_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID REFERENCES candidates(id),
  from_vaga_id UUID REFERENCES vagas_white_label(id),
  user_id UUID REFERENCES auth.users(id),
  transferred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE candidate_transfer_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own transfers" ON candidate_transfer_logs
  FOR SELECT USING (auth.uid() = user_id);
```

**Nota**: Isso é **opcional** para este plano. A correção do bug FK é independente do logging de auditoria.

---

## Resumo das mudanças (só o que importa)

```diff
+ [NOVO] supabase/migrations/054_fix_job_candidates_nullable_and_unique.sql
+   → ALTER COLUMN job_id DROP NOT NULL (se necessário)
+   → ADD CONSTRAINT job_candidates_candidate_job_key UNIQUE (candidate_id, job_id) (se não existir)

+ [NOVO] Analises.tsx:273  (hideBankButton: true)     ← CORREÇÃO BUG PRÉ-EXISTENTE
- talentTransferModal.tsx:310:      job_id: job.id,         ← REMOVER
- candidatePanel.tsx:1117:          || 'banco'              ← REMOVER
+ candidatePanel.tsx:1062:          Envolver botão com validação de UUID ← NOVO
- pipeline.tsx:743:                 .select('job_id')       ← .select('job_id, vaga_id')
- pipeline.tsx:751:                 map(...)                ← forEach com job_id e vaga_id
- pipeline.tsx:753:                 h.job_id && validJobIds.has(h.job_id)  ← (h.job_id||h.vaga_id) && validJobIds.has(h.job_id||h.vaga_id)
- candidateBank.tsx:328:            h.job_id                ← (h.job_id||h.vaga_id) && validJobIds.has(h.job_id||h.vaga_id)
```

**Total: 1 migration + 8 alterações em 5 arquivos.**
