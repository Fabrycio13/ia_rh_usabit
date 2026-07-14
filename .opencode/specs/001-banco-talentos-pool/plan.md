# Implementation Plan: Adicionar Candidato via Pool de Talentos

**Branch**: `001-banco-talentos-pool` | **Date**: 2026-05-29 | **Spec**: `specs/001-banco-talentos-pool/spec.md`

## Summary

Mover o botão "Adicionar" do Banco de Talentos (`CandidateBank.tsx`) para o Pool de Talentos (`PoolTalentos.tsx`) com fluxo em 2 etapas: upload PDF → extração IA + auto-preenchimento → revisão do HR → análise completa de IA → candidato vai para o Pool seguindo fluxo padrão existente.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.x

**Primary Dependencies**:
- Vite (bundler)
- Supabase JS Client (database + storage)
- pdfjs-dist (extração de texto de PDF + conversão para imagem)
- OpenAI API (extração de dados + análise de currículo)

**Storage**: PostgreSQL (tabela `candidates`), Supabase Storage (bucket `job-applications`)

**Testing**: Não solicitado (features sem testes)

**Target Platform**: Web (React SPA)

**Project Type**: Web application (frontend React + Supabase backend)

**Performance Goals**: N/A (operações assíncronas com IA, ~15s total)

**Constraints**:
- TypeScript strict mode
- ESLint `max-warnings 0`
- Não quebrar código existente fora do escopo
- Reutilizar funções existentes sem duplicar lógica
- `AddCandidateModal.tsx` não é excluído (apenas perde o ponto de entrada)

**Scale/Scope**: 2 componentes modificados, 1 novo componente, 3 arquivos de serviço modificados

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

A constituição do projeto está em estado template (sem princípios definidos). Nenhum gate violado.

- [x] Nenhuma violação de princípios constitucionais identificada
- [x] Feature de escopo cirúrgico, sem aumento de complexidade arquitetural
- [x] Reuso de funções existentes, sem nova dívida técnica

## Estrutura de Arquivos

```
specs/001-banco-talentos-pool/
├── plan.md              # Este arquivo
├── spec.md              # User stories e requisitos
├── research.md          # Decisões de design
├── data-model.md        # Entidades e campos
├── quickstart.md        # Guia de verificação
└── tasks.md             # Tarefas de implementação

src/
├── pages/
│   ├── candidates/
│   │   └── CandidateBank.tsx              ← Remover "Adicionar" (~L398-403, L715-726)
│   └── vagas/
│       └── PoolTalentos.tsx               ← Adicionar "Adicionar" + novo modal + atualizar filtro
├── features/
│   └── candidates/
│       └── components/
│           └── PoolAddCandidate.tsx       ← NOVO componente (fluxo completo)
├── core/
│   └── services/
│       ├── cvAnalyzer.ts                  ← Reuso (extractCandidateData)
│       ├── resumeAnalyzer.ts              ← Reuso (analyzeResume)
│       ├── pdfExtractor.ts               ← Reuso (extractTextFromPDF, pdfToImages)
│       └── ai/
│           ├── types/index.ts            ← Adicionar linkedin/portfolio ao CandidateExtraction
│           ├── prompts/extraction.ts     ← Atualizar prompt para linkedin/portfolio
│           └── parsers/validators.ts     ← Atualizar normalizeExtraction
```

## Fluxo Detalhado do PoolAddCandidate

```
┌─────────────────────────────────────────────────────────────────────┐
│  PoolAddCandidate.tsx                                                │
│                                                                      │
│  ETAPA 1 - UPLOAD + EXTRAÇÃO                                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  [Botão "Adicionar" no PoolTalentos]                          │   │
│  │  → state: showAddModal = true                                │   │
│  │  → Abre PoolAddCandidate como modal                           │   │
│  │                                                                 │   │
│  │  Modal: Dropzone / File input (apenas .pdf)                   │   │
│  │  → handleFileSelect(file)                                      │   │
│  │    1. Upload para storage: job-applications/resumes/manual/   │   │
│  │       {orgId}/{Date.now()}-{uuid}.pdf                         │   │
│  │    2. extractTextFromPDF(file) → text                         │   │
│  │    3. Se text.length < 80 → pdfToImages(file) → images[]      │   │
│  │    4. extractCandidateData(text, images) → CandidateExtraction│   │
│  │    5. Auto-preenche formData state                             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ETAPA 2 - REVISÃO DO HR                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Formulário editável com todos os campos                      │   │
│  │  Nome*, Email, Telefone, Idade, Gênero, Localização,         │   │
│  │  LinkedIn, Portfólio, Skills, Experiência, Educação          │   │
│  │                                                               │   │
│  │  [Analisar Currículo] ← botão principal                       │   │
│  │  → handleAnalyze()                                            │   │
│  │    1. analyzeResume(resumeFile) → ResumeAnalysis              │   │
│  │    2. Exibe resumo: score, classificação, pontos fortes, gaps │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ETAPA 3 - CONFIRMAÇÃO                                               │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  [Confirmar e Adicionar ao Pool] ← botão de salvamento       │   │
│  │  → handleSave()                                               │   │
│  │    1. Monta payload com formData + analysis completa          │   │
│  │    2. analysis.source = 'manual_add'                          │   │
│  │    3. supabase.from('candidates').insert(payload)             │   │
│  │    4. Toast sucesso, fecha modal, refresh Pool                │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Pontos de Atenção (Blind Spots Resolvidos)

| # | Blind Spot | Solução |
|---|------------|---------|
| 1 | `extractCandidateData` não recebia imagens | Passar `images[]` quando texto < 80 chars |
| 2 | Pool filtra apenas `source = 'spontaneous'` | Mudar para `or('spontaneous','manual_add')` |
| 3 | Dois buckets de storage diferentes | Usar `job-applications` (mesmo do fluxo espontâneo) |
| 4 | LinkedIn/Portfolio não extraídos | Adicionar ao `CandidateExtraction` + prompt |
| 5 | `analysis` JSONB com estrutura incompleta | Usar mesma estrutura do fluxo espontâneo |
| 6 | Insert direto vs Edge Function | Insert direto (usuário autenticado, RLS protege) |
| 7 | Fluxo "upload → salvar" vs "upload → revisar → analisar → salvar" | Separa em 3 etapas com estados |
| 8 | Excel/Word desnecessários | Apenas PDF |
| 9 | Path de storage sem organização | `resumes/manual/{orgId}/{timestamp}_{uuid}.pdf` |

## Dependências

1. US5 (CandidateExtraction) deve ser feito antes ou junto com US2 (novo componente usa os campos)
2. US1 (remover do CandidateBank) é independente e pode ser feito em paralelo com US2
3. US4 (atualizar filtro) deve ser feito depois de US3 (novo source salvo no banco)
4. US3 depende de US2 (modal criado antes da análise)

## Riscos

1. **Candidato duplicado**: Implementar verificação de email duplicado na org antes de salvar (reuso da lógica do AddCandidateModal)
2. **PDF muito grande/corrompido**: `pdfToImages` limita a 10 páginas; tratamento de erro para PDF inválido
3. **Custo de IA**: Duas chamadas (extração + análise) por candidato
4. **Tempo de processamento**: ~15s total; UX com loading states em cada etapa
