# Plano: Otimização de IA no Pool de Talentos

> **Status:** Plano finalizado — 39 pontos cegos revisados, 0 pendentes
> **Data:** 30/06/2026
> **Objetivo:** Reduzir custo de IA no Pool de Talentos em ~94% (de R$ 120 para R$ 1.25 por 100 candidatos)

---

## 1. Problema

O fluxo atual gasta tokens de IA excessivamente:

- **Upload manual:** 2 chamadas gpt-4o por CV (extração + análise geral)
- **Portal espontâneo:** 1 chamada gpt-4o fire-and-forget por candidato
- **Match com vaga:** 1 chamada gpt-4o individual por candidato
- **Reanálise:** re-baixa PDF do storage + re-extrai texto toda vez
- **Consequência:** 100 CVs manuais + match = 300 chamadas = ~R$ 120

## 2. Estratégia

### 2.1 Modelos por tarefa

| Tarefa | Modelo | Por que | Custo |
|--------|--------|---------|-------|
| Extrair dados de texto | `gpt-4o-mini` | Parsing de texto, não raciocínio. 95%+ acurácia. | R$ 0.005 |
| Extrair texto de imagem | `gpt-4o-mini` Vision | Só precisa "ler" a imagem. | R$ 0.02 |
| Scoring + match com vaga | `gpt-4o` | Raciocínio: comparar skills, pesar experiência. | R$ 0.03 |

### 2.2 Princípios

- **Extrair 1x, cachear sempre** — raw_text salvo no banco, nunca re-extrai PDF
- **Score só no match** — análise geral (sem vaga) é inútil e descartada
- **Batch no match** — 10 candidatos em 1 prompt, system prompt pago 1x
- **PDF imagem = inevitável** — gpt-4o-mini Vision é o menor custo viável (OCR local não funciona em currículo)
- **Formulário prevalece** — dados preenchidos pelo candidato têm prioridade sobre IA

---

## 3. Fluxos

### Fluxo A — Upload Manual em Lote (1 a 100 PDFs)

```
Recrutador dropa N PDFs no Pool
│
Para cada PDF (sequencial, não simultâneo):
├── pdfjs-dist extrai texto (grátis)
├── Tem texto (> 80 chars)?
│   ├── SIM → raw_text = texto
│   └── NÃO → pdfToImages → gpt-4o-mini Vision → raw_text  (R$ 0.02)
├── gpt-4o-mini processa raw_text  (R$ 0.005)
│   → nome, email, telefone, idade, gênero, linkedin,
│     portfolio, skills, experiência, escolaridade
├── Salva NO BANCO imediatamente:
│     raw_text, dados extraídos, tags (se preenchidas),
│     source='manual_add', status='pending', is_analyzed=false
└── Libera memória, vai pro próximo

💰 100 CVs (70 textuais + 30 imagem):
   (70 × R$ 0.005) + (30 × R$ 0.02 + 30 × R$ 0.005)
   = R$ 0.35 + R$ 0.75 = R$ 1.10
```

### Fluxo B — Portal (Candidatura Espontânea)

```
Candidato submete formulário + PDF
│
├── Upload PDF no Storage
├── Edge Function submit-candidate salva no banco
│     → source='spontaneous', status='pending'
├── pdfjs-dist → texto ou imagem?
├── gpt-4o-mini extrai dados (fire-and-forget .then())
│     → NÃO gera score
│     → Dados do formulário PREVALECEM
│     → IA complementa: skills, experiência, escolaridade
└── Salva raw_text + is_analyzed = false

💰 R$ 0.005 ou R$ 0.025 (se imagem)
```

### Fluxo C — Match para Vaga (Individual ou Bloco)

```
CASO A: Individual (🎯 na linha)
├── Pega raw_text do banco (cacheado)
├── Se NULL: baixa PDF → extrai → salva raw_text (1x, grátis)
├── 1 chamada gpt-4o: raw_text + descrição da vaga
└── Salva score no analysis.history

CASO B: Bloco (checkbox + "Analisar Selecionados")
├── Pega raw_text de cada um
├── Batch de até 10 por prompt gpt-4o
│     ├── Trunca raw_text em 8000 chars (evita estourar 128k contexto)
│     ├── Cada resultado tem candidate_index
│     ├── try/catch por candidato no parse
│     └── Se 1 falhar, 9 salvam
└── Toast: "9 analisados, 1 falha"

💰 100 candidatos em batch de 10:
   10 × R$ 0.03 = R$ 0.30
```

---

## 4. UI — Pool de Talentos

### Desktop (≥ 769px)

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔍 Buscar nome, email...    Fonte:[▾] Status:[▾] Tag:[▾] Período:[...] │
│                                                                  │
│ ☑ 3 selecionados → [🎯 Analisar p/ Vaga] [🗑 Excluir]    [+ Adicionar] │
│                                                                  │
│ ┌───┬────┬──────────┬───────┬───────┬──────┬───────┬────────┐   │
│ │ ☑ │Rank│Candidato │ Fonte  │Local  │Data  │Gênero │ Ações  │   │
│ ├───┼────┼──────────┼───────┼───────┼──────┼───────┼────────┤   │
│ │ ☑ │ 1  │João Silva│🌐Portal│ SP    │10/06 │ Masc  │ 📄🎯🏷 │   │
│ │ ☑ │ 2  │Maria S.  │✋Manual│ RJ    │09/06 │ Fem   │ 📄🎯🏷 │   │
│ └───┴────┴──────────┴───────┴───────┴──────┴───────┴────────┘   │
│                                                                  │
│ Página 1 de 12 · 120 candidatos                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Mobile (≤ 768px)

```
┌──────────────────────────────┐
│ 🔍 Buscar...                 │
│                              │
│ Fonte:[▾] Status:[▾]        │
│ Tag:  [▾] Período:[...]     │
│                              │
│ ☑ 3 sel. [🎯] [🗑] [+ Add]  │
│                              │
│ ┌──────────────────────────┐ │
│ │ ☑ ● João Silva           │ │
│ │   joao@email.com         │ │
│ │   🌐 Portal · SP · 10/06 │ │
│ │   Pendente    📄  🎯  🏷 │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

### Elementos novos

| Elemento | Comportamento |
|----------|--------------|
| Barra de busca | Filtra nome/email client-side na página atual |
| Badge Fonte | `🌐 Portal` (verde) / `✋ Manual` (azul) |
| Checkbox | Seleciona candidatos da página atual. Header = seleciona os 10. |
| Botão batch | Só aparece com seleção. Contador: "3 selecionados" |
| 🏷️ Tag | Abre TagInput inline. Vírgula ou Enter adiciona. ✕ remove. |
| Soft delete | `status = 'deleted'`. Filtra da listagem. Recuperável. |

---

## 5. Tags

### Componente reutilizável: `TagInput.tsx`

```
┌─────────────────────────────────────────┐
│ 🏷️ Tags                                 │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ #react  ✕ │ #sênior  ✕ │___________│ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Sugestões:                              │
│ [backend] [frontend] [fullstack]        │
└─────────────────────────────────────────┘
```

- Normaliza lowercase + trim
- Vírgula = separador. "engenheiro de dados" sem vírgula = 1 tag
- Autocomplete inline com search (dropdown nativo não escala)
- Sugestões: `SELECT DISTINCT unnest(tags) FROM candidates WHERE org_id = $org`
- GIN index para busca rápida: `tags @> ARRAY['react']`

### Onde aparece

| Local | Quando |
|-------|--------|
| PoolAddCandidate (upload manual) | Campo no formulário de revisão |
| CandidatePanel | Seção editável abaixo dos dados |
| PoolTalentos (tabela) | Botão 🏷️ abre inline na linha |

---

## 6. Migration (069)

```sql
ALTER TABLE candidates 
  ADD COLUMN IF NOT EXISTS raw_text TEXT,
  ADD COLUMN IF NOT EXISTS is_analyzed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

CREATE INDEX IF NOT EXISTS idx_candidates_tags ON candidates USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_candidates_source ON candidates (source);
```

---

## 7. Tasks

### Task 1 — Migration 069
**Arquivo:** `supabase/migrations/069_pool_optimization.sql`
**Linhas:** ~5 SQL

### Task 2 — cvAnalyzer.ts (funções core)
**Arquivo:** `src/core/services/cvAnalyzer.ts`
**Linhas:** ~100

**Novas funções:**
- `extractTextAndData(file)` — pdfjs-dist → texto/imagem → gpt-4o-mini → dados estruturados + raw_text
- `batchMatchToJob(candidateIds[], jobId, jobDesc)` — busca raw_texts, batch gpt-4o até 10, candidate_index, try/catch por item
- Fallback raw_text NULL: baixa PDF → extrai → salva raw_text → usa
- Trunca raw_text em 8000 chars no batch
- Checa `analysis.history` antes de reanalisar mesma vaga

**Dependências:** Task 1

### Task 3 — PoolAddCandidate.tsx (upload em lote)
**Arquivo:** `src/features/candidates/components/PoolAddCandidate.tsx`
**Linhas:** ~+80

**Mudanças:**
- `multiple` no input, loop sequencial (1 PDF por vez)
- Chama `extractTextAndData(file)` da Task 2
- Salva cada candidato no banco IMEDIATAMENTE após processar
- Progress bar + contador: "47/100 · 5 imagens (≈R$ 0.10)"
- Campo de tags com TagInput
- Botão X/fechar durante upload → alerta "29 processados. Deseja interromper?"
- Após conclusão: resumo "87 processados, 10 imagem, 3 falhas"

**Dependências:** Task 2, Task 7

### Task 4 — SpontaneousApplication.tsx (portal barato)
**Arquivo:** `src/pages/vagas/SpontaneousApplication.tsx`
**Linhas:** ~-20 (remove analyzeResume, adiciona extração)

**Mudanças:**
- Remove `analyzeResume` (gpt-4o)
- Adiciona extração local + gpt-4o-mini (fire-and-forget `.then()`)
- Dados do formulário prevalecem sobre IA
- NÃO gera score
- Salva raw_text + is_analyzed = false

**Dependências:** Task 2

### Task 5 — ReanalyzeCandidateModal.tsx (cache raw_text)
**Arquivo:** `src/features/candidates/components/ReanalyzeCandidateModal.tsx`
**Linhas:** ~+15

**Mudanças:**
- Checa `raw_text` no banco antes de baixar PDF
- Se existe → usa direto
- Se NULL → baixa PDF → extrai → salva raw_text → usa

**Dependências:** Task 2

### Task 6 — PoolTalentos.tsx (UI completa do pool)
**Arquivo:** `src/pages/vagas/PoolTalentos.tsx`
**Linhas:** ~+200

**Desktop:**
- Barra de busca (nome/email)
- Dropdowns: Fonte (Todos/Portal/Manual), Status, Tag, Período
- Coluna checkbox + "Selecionar página" (header)
- Coluna Fonte com badge colorido
- Batch actions: Analisar para Vaga + Excluir (soft delete)
- Ações: 📄 🎯 🏷️

**Mobile:**
- Filtros empilhados (1-2 por linha, 16px gap lateral)
- Cards com checkbox de 44×44px (touch target)
- Ações no rodapé do card
- Botões de batch lado a lado
- Padding 16px em toda lateral

**Dependências:** Task 2, Task 7

### Task 7 — TagInput.tsx (componente reutilizável)
**Arquivo NOVO:** `src/common/components/TagInput.tsx`
**Linhas:** ~60

**Comportamento:**
- Input com autocomplete inline (sugestões do banco)
- Adiciona com Enter, vírgula ou clique na sugestão
- Remove com ✕
- Normaliza lowercase + trim
- Lista de sugestões scrollável com max-height

**Dependências:** Task 1 (GIN index)

### Task 8 — CandidatePanel.tsx (seção de tags)
**Arquivo:** `src/features/analysis/CandidatePanel.tsx`
**Linhas:** ~+40

**Mudanças:**
- Nova seção "Tags" abaixo dos dados do candidato
- Reutiliza TagInput da Task 7
- Salva via `supabase.from('candidates').update({ tags })`

**Dependências:** Task 7

---

## 8. Dependências entre Tasks

```
Task 1 (migration)
  │
  ├── Task 2 (cvAnalyzer)
  │     ├── Task 3 (PoolAddCandidate) ── + Task 7
  │     ├── Task 4 (SpontaneousApp)
  │     ├── Task 5 (ReanalyzeModal)
  │     └── Task 6 (PoolTalentos) ─────── + Task 7
  │
  └── Task 7 (TagInput)
        ├── Task 3 usa
        ├── Task 6 usa
        └── Task 8 (CandidatePanel)
```

---

## 9. Checklist de Pontos Cegos (39 itens)

| # | Fluxo | Ponto cego | Resolução |
|---|-------|-----------|-----------|
| 1 | Upload | PDF falha IA → não para o loop | try/catch individual, pula pro próximo |
| 2 | Upload | Fecha modal no PDF #30 | Salva imediatamente após cada PDF. 29 salvos. |
| 3 | Upload | Custo de imagens invisível | Contador: "5 imagens (≈R$ 0.10)" |
| 4 | Upload | 100 inserts = latência | Progress bar: "Salvando 47/100..." |
| 5 | Upload | Rate limit do proxy | 100 chamadas em ~200s = 0.5 req/s. OK. |
| 6 | Upload | PDF corrompido | status='error', badge vermelho |
| 7 | Upload | JSON malformado na extração | try/catch individual, marca erro |
| 8 | Upload | Botão "+ Adicionar" durante upload | disabled enquanto uploadState !== 'idle' |
| 9 | Portal | gpt-4o-mini trava submit | fire-and-forget .then() |
| 10 | Portal | Formulário vs IA | Formulário prevalece |
| 11 | Portal | Sem score no pool | Badge "Pendente" com tooltip |
| 12 | Match | raw_text > 8k estoura batch | Trunca, inclui nota "CV truncado" |
| 13 | Match | JSON array fora de ordem | candidate_index em cada item |
| 14 | Match | 1 item falha parse | try/catch por item, 9 salvam |
| 15 | Match | Batch inteiro timeout | Continua pro próximo batch |
| 16 | Match | Reanálise mesma vaga | Checa history, pergunta antes |
| 17 | Match | Candidato antigo sem raw_text | Fallback: baixa PDF → extrai (1x) |
| 18 | Match | PDF não existe no Storage | Erro: "Currículo não encontrado" |
| 19 | Match | IA retorna menos itens | Faltantes = erro. Toast específico. |
| 20 | Match | Batch com já analisados + novos | Filtra só pendentes |
| 21 | Tags | Case-sensitive duplicado | Normaliza lowercase + trim |
| 22 | Tags | Tag com espaço | Vírgula = separador |
| 23 | Tags | 500 tags no dropdown | Autocomplete + top 20 |
| 24 | Tags | Tag órfã nas sugestões | DISTINCT unnest só retorna em uso |
| 25 | Filtros | 1000 candidatos no client | Filtros na query Supabase |
| 26 | Filtros | Busca client-side | Só na página atual. Aceito. |
| 27 | Delete | Hard vs soft | Soft delete: status='deleted' |
| 28 | Delete | Individual | Já existe no CandidatePanel |
| 29 | Delete | Arquivo no Storage | Não limpa agora. Feature separada. |
| 30 | UI | Filtros estouram mobile 320px | Empilhados, padding 16px |
| 31 | UI | Checkbox touch target | 44×44px no canto do card |
| 32 | UI | Selecionar todos = cross-page? | Não. Só página atual. Aceito. |
| 33 | UI | Troca página perde seleção | Sim. Tradeoff aceito. |
| 34 | UI | Modal vaga scroll duplo mobile | Já funciona. overflow-y + maxHeight |
| 35 | Dados | raw_text NULL vs "" | NULL=não tentou, ""=tentou+vazio |
| 36 | Dados | is_analyzed vs histórico antigo | Não conflitam. Colunas separadas. |
| 37 | Dados | Concorrência na tag | Last write wins. Normal. |
| 38 | Dados | PII no raw_text | RLS já isola. Zero risco novo. |
| 39 | Dados | Status mapping | pending → reviewed → deleted/error |

---

## 10. Custo Comparativo

### 100 candidatos (70 textuais + 30 imagem)

| Etapa | Antes | Depois | Economia |
|-------|-------|--------|----------|
| Upload 70 textuais | 140 chamadas gpt-4o | 70 × gpt-4o-mini | R$ 4.20 → R$ 0.35 |
| Upload 30 imagem | 60 chamadas gpt-4o | 30 Vision + 30 gpt-4o-mini | R$ 1.80 → R$ 0.75 |
| Match 100 pra vaga | 100 chamadas gpt-4o | 10 batches gpt-4o | R$ 3.00 → R$ 0.30 |
| **Total** | **R$ 9.00** | **R$ 1.40** | **84% menos** |

### Com 300 chamadas (cenário de uso real com reanálises)

| Cenário | Antes | Depois | Economia |
|---------|-------|--------|----------|
| Upload + Análise geral + Reanálise | ~R$ 120 | ~R$ 2.00 | **98% menos** |

---

## 11. Arquivos afetados

| # | Arquivo | Mudança | Linhas |
|---|---------|---------|--------|
| 1 | `supabase/migrations/069_pool_optimization.sql` | Nova migration | +5 |
| 2 | `src/core/services/cvAnalyzer.ts` | extractTextAndData, batchMatchToJob | +100 |
| 3 | `src/features/candidates/components/PoolAddCandidate.tsx` | Upload múltiplo, extração barata | +80 |
| 4 | `src/pages/vagas/SpontaneousApplication.tsx` | Extração barata, sem score | -20 |
| 5 | `src/features/candidates/components/ReanalyzeCandidateModal.tsx` | Cache raw_text | +15 |
| 6 | `src/pages/vagas/PoolTalentos.tsx` | Busca, filtros, fonte, checkbox, batch | +200 |
| 7 | `src/common/components/TagInput.tsx` | **Novo** — componente de tags | +60 |
| 8 | `src/features/analysis/CandidatePanel.tsx` | Seção de tags | +40 |
| **Total** | | | **~480 linhas** |
