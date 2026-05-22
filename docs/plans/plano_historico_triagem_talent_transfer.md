# Plano de Correção: Histórico de Triagem ao transferir candidato via TalentTransferModal

## Contexto do Problema

Quando um candidato é transferido para o Banco de Talentos **e aceito no Pipeline** via `TalentTransferModal`, o card é criado em `pipeline_cards` na coluna "Triagem", mas **nenhum log é registrado** em `candidate_screening_logs`.

Em contraste, quando um candidato é adicionado ao pipeline diretamente pela página `Pipeline.tsx` (função `addCard`, linha 882), a função `logScreening()` é chamada corretamente.

### Consequência

Na aba "Triagem" do `CandidatePanel`, os candidatos transferidos via `TalentTransferModal` **não aparecem** no histórico de triagem, pois não há registros em `candidate_screening_logs` para eles.

### O que já funciona

- **Movimentações** (drag-and-drop, menu "Mover para..."): já chamam `logScreening()` ✅
- **Adição direta no Pipeline**: `addCard()` chama `logScreening()` ✅
- **Exibição dos logs**: UI do `CandidatePanel` já agrupa por pipeline/vaga e exibe timeline ✅

### O que está quebrado

- **Adição via TalentTransferModal**: NÃO chama `logScreening()` ❌
- **Nome do pipeline não é persistido**: O modal armazena `pipelineId` mas não o nome, necessário para o log

---

## Arquivos que precisam de alteração

| # | Arquivo | O que fazer | Risco |
|---|---------|-------------|-------|
| 1 | `TalentTransferModal.tsx` | Adicionar `pipelineName` state + importar logger + chamar `logScreening()` e `logActivity()` | 🟢 Baixo |

---

## Passo a Passo

### Passo 1: `TalentTransferModal.tsx` — Adicionar logging de triagem

**Arquivo:** `src/features/candidates/components/TalentTransferModal.tsx`

#### 1a. Adicionar import do logger (topo do arquivo)

**Antes (linhas 1-5):**
```typescript
import { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Loader, GitMerge as PipelineIcon, UserPlus } from 'lucide-react';
import { supabase } from '../../../core/services/supabase';
import { useUser } from '../../../core/contexts/UserContext';
import toast from 'react-hot-toast';
```

**Depois:**
```typescript
import { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Loader, GitMerge as PipelineIcon, UserPlus } from 'lucide-react';
import { supabase } from '../../../core/services/supabase';
import { useUser } from '../../../core/contexts/UserContext';
import toast from 'react-hot-toast';
import { logScreening, logActivity } from '../../../core/services/logger';
```

#### 1b. Adicionar estado `pipelineName` (após linha 42)

**Antes:**
```typescript
const [pipelineId, setPipelineId] = useState<string | null>(null);
const [creatingPipeline, setCreatingPipeline] = useState(false);
```

**Depois:**
```typescript
const [pipelineId, setPipelineId] = useState<string | null>(null);
const [pipelineName, setPipelineName] = useState<string | null>(null);
const [creatingPipeline, setCreatingPipeline] = useState(false);
```

#### 1c. Armazenar `pipelineName` no `checkPipeline()` (3 pontos)

**Ponto 1 — encontrado via vaga_id** (após linha 65):
```typescript
setPipelineId(found.id);
setPipelineName(found.name);        // ← ADICIONAR
setHasPipeline(true);
```

**Ponto 2 — encontrado via pipeline_id da vaga** (após linha 83):
```typescript
setPipelineId(vaga.pipeline_id);
setHasPipeline(true);

// Buscar nome do pipeline
const { data: pipeNameData } = await supabase
    .from('pipelines')
    .select('name')
    .eq('id', vaga.pipeline_id)
    .maybeSingle();
setPipelineName(pipeNameData?.name || null);

return;
```

**Ponto 3 — match por nome** (após linha 107):
```typescript
setPipelineId(match.id);
setPipelineName(match.name);        // ← ADICIONAR
setHasPipeline(true);
```

#### 1d. Armazenar `pipelineName` no `handleCreatePipeline()` (após linha 170)

**Antes:**
```typescript
setPipelineId(newPipelineId);
setHasPipeline(true);
```

**Depois:**
```typescript
setPipelineId(newPipelineId);
setPipelineName(`Pipeline - ${job.title}`);
setHasPipeline(true);
```

#### 1e. Armazenar `pipelineName` no `handleLinkExisting()` (após linha 201)

**Antes:**
```typescript
setPipelineId(selectedExistingId);
setHasPipeline(true);
```

**Depois:**
```typescript
setPipelineId(selectedExistingId);
const selectedPipe = allPipelines.find(p => p.id === selectedExistingId);
setPipelineName(selectedPipe?.name || null);
setHasPipeline(true);
```

#### 1f. Adicionar `logScreening()` e `logActivity()` após inserir card no pipeline (após linha 363)

**Localização:** Dentro de `handleTransfer()`, bloco `if (addToPipeline && pipelineId)`, dentro de `if (firstCol)`.

**Duas alterações aqui:**

**(i) Select da primeira coluna precisa incluir `name`** (linha 340):

**Antes:**
```typescript
const { data: firstCol } = await supabase
    .from('pipeline_columns')
    .select('id')
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();
```

**Depois:**
```typescript
const { data: firstCol } = await supabase
    .from('pipeline_columns')
    .select('id, name')
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();
```

**(ii) Adicionar logs após inserir o card** (após linha 363):

**Antes (linhas 346-366):**
```typescript
if (firstCol) {
    await supabase
        .from('pipeline_cards')
        .insert({
            pipeline_id: pipelineId,
            candidate_id: dbCandidate.id,
            column_id: firstCol.id,
            position: 0,
            user_id: profile.userId,
            organization_id: profile.organization_id,
            vaga_id: job.id,
            notes: JSON.stringify({
                selected_job_id: job.id,
                selected_job_name: job.title,
                selected_job_score: candidate.match_score
            })
        });
}
```

**Depois:**
```typescript
if (firstCol) {
    await supabase
        .from('pipeline_cards')
        .insert({
            pipeline_id: pipelineId,
            candidate_id: dbCandidate.id,
            column_id: firstCol.id,
            position: 0,
            user_id: profile.userId,
            organization_id: profile.organization_id,
            vaga_id: job.id,
            notes: JSON.stringify({
                selected_job_id: job.id,
                selected_job_name: job.title,
                selected_job_score: candidate.match_score
            })
        });

    await logScreening(profile.userId, dbCandidate.id, 'inclusion', null, firstCol.name || 'Triagem', {
        job_id: job.id,
        job_name: job.title,
        pipeline_id: pipelineId,
        pipeline_name: pipelineName
    });
    await logActivity(profile.userId, `Iniciou triagem de "${candidate.name}" em "${pipelineName || job.title}"`, {
        pipeline_id: pipelineId,
        vaga_id: job.id
    });
}
```

---

## O que NÃO precisa ser alterado

| Arquivo | Motivo |
|---------|--------|
| `Pipeline.tsx` (addCard) | Já chama `logScreening()` e `logActivity()` ✅ |
| `Pipeline.tsx` (drag-drop, moveCard) | Já chamam `logScreening()` ✅ |
| `CandidatePanel.tsx` (triagem tab) | UI já renderiza os logs de `candidate_screening_logs` ✅ |
| `logger.ts` | Funções `logScreening()` e `logActivity()` já existem ✅ |

---

## Ordem de Implementação

```
1. TalentTransferModal.tsx → 1 alteração (import + state + 4 pontos de set + log)
```

---

## Como testar após implementar

### 1. Build
```bash
npm run build
```

### 2. Teste funcional — Log de inclusão ao transferir com pipeline

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1 | Abrir uma vaga em Vagas | Página de candidatos |
| 2 | Clicar em "Mover para Banco de Talentos" | Modal abre |
| 3 | Clicar em "Adicionar ao Banco e Iniciar Triagem" | ✅ Toast de sucesso |
| 4 | Ir em Pipeline, abrir o pipeline | ✅ Card aparece na coluna "Triagem" |
| 5 | Clicar no card do candidato | ✅ Abre CandidatePanel |
| 6 | Clicar na aba "Triagem" | ✅ Mostra: "Candidato incluído na vaga - Etapa inicial: Triagem" com timestamp e nome da vaga/pipeline |

### 3. Teste de movimentação — Log de transição

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1 | Arrastar card de "Triagem" para "Entrevista" | ✅ Card move |
| 2 | Abrir CandidatePanel do candidato | ✅ Aba "Triagem" mostra "Transição de Etapa - Mudou de Triagem para Entrevista" com timestamp |

### 4. Teste de regressão — Pipeline vinculado via pipeline_id na vaga

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1 | Ter uma vaga com `pipeline_id` preenchido (sem `vaga_id` no pipeline) | Cenário de migração |
| 2 | Transferir candidato via modal | ✅ Nome do pipeline é buscado e incluído no log |

---

## Se algo der errado

### Rollback:
```bash
git checkout -- src/features/candidates/components/TalentTransferModal.tsx
```

### Se o log não aparecer na aba Triagem:
1. Verificar se `candidate_screening_logs` tem registros para o `candidate_id`:
   ```sql
   SELECT * FROM candidate_screening_logs 
   WHERE candidate_id = '<uuid>' 
   ORDER BY created_at DESC;
   ```
2. Verificar se o `action` é `'inclusion'` e se `details` contém `job_name`/`pipeline_name`
3. Verificar se o `user_id` não é vazio (logScreening valida userId e candidateId)

---

## Resumo das mudanças

```diff
+ talentTransferModal.tsx:5:       import { logScreening, logActivity } from '.../logger'
+ talentTransferModal.tsx:43:      const [pipelineName, setPipelineName] = useState(null)
~ talentTransferModal.tsx:65:      + setPipelineName(found.name)
~ talentTransferModal.tsx:81-87:   + select name do pipeline + setPipelineName
~ talentTransferModal.tsx:107:     + setPipelineName(match.name)
~ talentTransferModal.tsx:170:     + setPipelineName(`Pipeline - ${job.title}`)
~ talentTransferModal.tsx:201-202: + setPipelineName(selectedPipe?.name || null)
~ talentTransferModal.tsx:340:     .select('id') → .select('id, name')
+ talentTransferModal.tsx:364-385: logScreening() + logActivity() após inserir card
```

**Total: 1 import + 1 state + 6 alterações + 1 bloco de logging = ~20 linhas em 1 arquivo.**
