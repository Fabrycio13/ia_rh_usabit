# Tasks: Adicionar Candidato via Pool de Talentos

**Input**: Design documents from `specs/001-banco-talentos-pool/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Organization**: Tasks grouped by user story for independent implementation

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Include exact file paths

---

## Phase 1: Foundational — US5: CandidateExtraction (P2)

**Purpose**: Estender o tipo `CandidateExtraction` com campos `linkedin` e `portfolio` + atualizar prompt e validador. Deve ser concluído antes do novo componente que usa estes campos.

- [x] T001 [US5] Adicionar `linkedin: string | null` e `portfolio: string | null` ao `CandidateExtraction` em `src/core/services/ai/types/index.ts`
- [x] T002 [P] [US5] Atualizar prompt `buildExtractionMessages` em `src/core/services/ai/prompts/extraction.ts` para solicitar linkedin e portfolio
- [x] T003 [P] [US5] Atualizar `normalizeExtraction` em `src/core/services/ai/parsers/validators.ts` para os novos campos

**Checkpoint**: CandidateExtraction estendido — novo componente pode consumir os campos

---

## Phase 2: US1 — Remover "Adicionar" do Banco de Talentos (P1)

**Goal**: Remover o botão "Adicionar" do CandidateBank sem afetar nenhum outro código

**Independent Test**: Abrir `/candidatos` — botão "Adicionar" não deve aparecer. Abrir `/vagas?tab=pool` — botão "Adicionar" não deve ter sumido de lá (nunca existiu lá).

- [x] T004 [P] [US1] Remover botão "Adicionar" (`Plus` + texto) em `src/pages/candidates/CandidateBank.tsx` ~L398-403
- [x] T005 [US1] Remover estado `showAddModal` e função `setShowAddModal` em `src/pages/candidates/CandidateBank.tsx`
- [x] T006 [US1] Remover import e uso de `AddCandidateModal` em `src/pages/candidates/CandidateBank.tsx` ~L10, ~L715-726
- [x] T007 [US1] Remover import de `Plus` do `lucide-react` em `src/pages/candidates/CandidateBank.tsx` ~L4

**⚠️ Cuidado**: `CandidateBank.tsx` ~L715-726 tem `onViewCandidate` que usa `candidates.find(c => c.id === candidateId)`. Remover apenas o JSX do `<AddCandidateModal>`, manter a lógica de `fetchCandidatesRef` e `openCandidate` intactas.

**Checkpoint**: CandidateBank sem "Adicionar" — compila sem erros, lint passa

---

## Phase 3: US2 + US3 — Criar PoolAddCandidate (P1)

**Goal**: Criar novo componente `PoolAddCandidate` com fluxo completo: upload PDF → extração IA → revisão HR → análise completa → salvar no Pool

**Independent Test**: Abrir `/vagas?tab=pool` → clicar "Adicionar" → fazer upload de PDF → ver campos auto-preenchidos → clicar "Analisar Currículo" → ver análise → confirmar → candidato aparece no Pool

### Preparação

- [x] T008 [P] Importar funções existentes no novo componente: `extractTextFromPDF`, `pdfToImages` de `src/core/services/pdfExtractor.ts`
- [x] T009 [P] Importar `extractCandidateData` de `src/core/services/cvAnalyzer.ts`
- [x] T010 [P] Importar `analyzeResume` de `src/core/services/resumeAnalyzer.ts`
- [x] T011 [P] Importar tipos: `CandidateExtraction`, `ResumeAnalysis` de `src/core/services/ai/types`
- [x] T012 [US2] Criar `src/features/candidates/components/PoolAddCandidate.tsx` com estrutura base: `isOpen`, `onClose`, `onSuccess` props, modal overlay, estados do formulário
- [x] T013 [US2] Implementar `handleFileSelect`: validação de PDF, upload para `job-applications/resumes/manual/{orgId}/{timestamp}_{uuid}.pdf`, extração de texto, conversão para imagens se < 80 chars
- [x] T014 [US2] Implementar chamada a `extractCandidateData(text, images)` e auto-preenchimento do formulário com `CandidateExtraction`
- [x] T015 [US2] Renderizar formulário editável com todos os campos: nome, email, telefone, localização, idade, gênero, LinkedIn, portfólio, skills, experiência, educação
- [x] T016 [US3] Implementar `handleAnalyze`: chamar `analyzeResume(resumeFile)`, exibir resumo da análise (score, classificação, pontos fortes, gaps)
- [x] T017 [US3] Implementar `handleSave`: montar payload com `analysis.source = 'manual_add'`, estrutura JSONB completa igual ao fluxo espontâneo, insert via `supabase.from('candidates').insert()`
- [x] T018 [US3] Adicionar verificação de email duplicado antes de salvar (reuso da lógica do `AddCandidateModal`)
- [x] T019 [US3] Adicionar loading states em cada etapa (upload, extração, análise, salvamento)
- [x] T020 [US3] Adicionar tratamento de erro para cada etapa com `toast.error` e fallbacks
- [x] T021 [US2] Adicionar botão "Adicionar" no cabeçalho de `src/pages/vagas/PoolTalentos.tsx`
- [x] T022 [US2] Integrar `<PoolAddCandidate>` no JSX de `PoolTalentos.tsx` com `isOpen`, `onClose`, `onSuccess` (recarregar lista após sucesso)

**Checkpoint**: PoolAddCandidate funcional — candidato adicionado via Pool aparece na listagem

---

## Phase 4: US4 — Atualizar Filtro do Pool (P2)

**Goal**: Atualizar query do PoolTalentos para incluir candidatos com `analysis->>source = 'manual_add'`

**Independent Test**: Candidato adicionado via PoolAddCandidate aparece na listagem do Pool

- [x] T023 [US4] Alterar filtro em `src/pages/vagas/PoolTalentos.tsx` ~L96 de `.filter('analysis->>source', 'eq', 'spontaneous')` para `.or('analysis->>source.eq.spontaneous,analysis->>source.eq.manual_add')`
- [x] T024 [US4] Verificar se há outras queries no mesmo arquivo que também precisam do mesmo filtro (refresh, callbacks, etc.) — 5 ocorrências atualizadas com replaceAll

**Checkpoint**: Todos os candidatos (spontaneous + manual_add) aparecem no Pool

---

## Phase 5: Build Validation

**Purpose**: Garantir que o código compila, lint passa, sem warnings

**Independent Test**: `npm run build`, `npx tsc --noEmit`, `npm run lint` — todos passam sem erros nem warnings

- [ ] T025 Executar `npx tsc --noEmit` e corrigir erros de tipo
- [ ] T026 Executar `npm run lint` e corrigir warnings/erros
- [ ] T027 Executar `npm run build` (ou `vite build`) e verificar build bem-sucedido
- [ ] T028 Verificar manualmente: `/candidatos` sem "Adicionar", `/vagas?tab=pool` com "Adicionar" funcionando

**Checkpoint**: Build 100% funcional, zero erros, zero warnings

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US5)**: Sem dependências — tipos podem ser estendidos a qualquer momento
- **Phase 2 (US1)**: Independente — pode ser feito em paralelo com Phase 1 e Phase 3
- **Phase 3 (US2+US3)**: Depende de Phase 1 (novo componente usa `CandidateExtraction` estendido)
- **Phase 4 (US4)**: Depende de Phase 3 (precisa de candidatos `manual_add` no banco para testar)
- **Phase 5 (Build)**: Depende de todas as fases anteriores

### User Story Dependencies

- **US5 (P2)**: Sem dependências — pode ser feito primeiro
- **US1 (P1)**: Independente — pode ser feito em paralelo com US5 e US2
- **US2 (P1)**: Depende de US5 (tipo estendido)
- **US3 (P1)**: Depende de US2 (componente existente) — mas implementado junto
- **US4 (P2)**: Depende de US3 (candidatos `manual_add` no banco)

### Parallel Opportunities

- T001 a T007 podem rodar em paralelo (Phase 1 + Phase 2)
- T008 a T011 (imports) podem rodar em paralelo com T004 a T007
- T012 a T024 são sequenciais dentro de cada fase

---

## Implementation Strategy

### MVP (apenas US1 removida — escopo mínimo)

1. Phase 1: US5 (tipos)
2. Phase 2: US1 (remover do CandidateBank)
3. **STOP**: CandidateBank sem "Adicionar" — deploy da remoção

### Completo (tudo)

1. Phase 1: US5
2. Phase 2: US1 (paralelo com Phase 3)
3. Phase 3: US2+US3
4. Phase 4: US4
5. Phase 5: Build validation

### Ordem recomendada de execução

```
T001 → T002 → T003  (US5 - tipos)
T004 → T005 → T006 → T007  (US1 - remoção do banco, paralelo)
T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015  (US2 - criação do componente)
T016 → T017 → T018 → T019 → T020  (US3 - análise + salvamento)
T021 → T022  (US2 - integração no Pool)
T023 → T024  (US4 - filtro)
T025 → T026 → T027 → T028  (Build validation)
```

---

## Notes

- [P] tasks = different files, no dependencies — podem rodar em paralelo
- [Story] label maps task to specific user story
- Não excluir `AddCandidateModal.tsx` — apenas remover seu ponto de entrada
- `CandidateBank.tsx` manter `fetchCandidatesRef` e `openCandidate` intactos
- Fazer build + lint + typecheck completos antes de considerar a tarefa finalizada
