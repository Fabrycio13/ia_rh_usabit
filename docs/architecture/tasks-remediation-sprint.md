---
description: "Task list for remediation sprint — seguranca e qualidade"
---

# Tasks: Remediação Segurança e Qualidade — Usabit people

**Input**: `docs/architecture/PLAN-003-remediacao-seguranca-e-qualidade.md`

**Prerequisites**: N/A (remediation sprint, no feature spec)

**Tests**: Test tasks are included. Write them BEFORE implementation (TDD).

**Organization**: Tasks grouped by priority phase (CRITICAL → HIGH → MEDIUM → LOW)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1=Security, US2=Architecture, US3=Code Quality, US4=Polish)
- Include exact file paths in descriptions

## Phase 0: Setup

**Purpose**: Create branch and verify current state

- [ ] T001 Create branch `fix/remediation-sprint` from `edit-pipeline`
- [ ] T002 [P] Verify TypeScript compiles: run `npx tsc --noEmit` — must pass
- [ ] T003 [P] Verify lint passes: run `npm run lint` — must pass

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Security infrastructure that MUST be complete before US1 tasks

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create `supabase/functions/openai-proxy/index.ts` with CORS validation and OpenAI forwarding
- [ ] T005 Deploy Edge Function: `npx supabase functions deploy openai-proxy --project-ref dfsqdfetzcwvmfphljzs`
- [ ] T010b [US1] Remove `VITE_OPENAI_API_KEY` from `.github/workflows/deploy.yml` env vars

**Checkpoint**: Foundation ready — Edge Function proxy deployed, deploy.yml cleaned

---

## Phase 2: User Story 1 — Segurança (Priority: CRITICAL) 🔴

**Goal**: Remove OpenAI key exposure from browser, secure all credential handling

**Independent Test**: Open DevTools → Network tab → analyze a CV. Verify NO requests go to `api.openai.com` directly. All requests go to Supabase Edge Function proxy.

### Tests for User Story 1

> **NOTE**: Write these tests FIRST, ensure they FAIL before implementation

- [ ] T011 [P] [US1] Write test: cvAnalyzer must NOT instantiate OpenAI directly in `tests/unit/cvAnalyzer.test.ts`
- [ ] T012 [P] [US1] Write test: cvAnalyzer must call proxy endpoint in `tests/unit/cvAnalyzer.test.ts`
- [ ] T013 [P] [US1] Write test: jobAnalyzer must NOT instantiate OpenAI directly in `tests/unit/jobAnalyzer.test.ts`
- [ ] T014 [P] [US1] Write test: OpenAI proxy must reject requests without auth in `tests/security/openai-proxy.test.ts`
- [ ] T015 [P] [US1] Write test: OpenAI proxy must NOT expose API key in responses in `tests/security/openai-proxy.test.ts`
- [ ] T016 [P] [US1] Write test: OpenAI proxy must only allow allowed origins in `tests/security/openai-proxy.test.ts`

### Implementation for User Story 1

- [ ] T017 [P] [US1] Create `src/core/services/aiClient.ts` with `callOpenAI()` function using proxy endpoint
- [ ] T018 [US1] Replace direct OpenAI instantiation in `src/core/services/cvAnalyzer.ts` with `callOpenAI()` from `aiClient.ts`
- [ ] T019 [US1] Replace direct OpenAI instantiation in `src/core/services/jobAnalyzer.ts` with `callOpenAI()` from `aiClient.ts`
- [ ] T020 [US1] Remove `import OpenAI from 'openai'` and `dangerouslyAllowBrowser` from `cvAnalyzer.ts`
- [ ] T021 [US1] Remove `import OpenAI from 'openai'` and `dangerouslyAllowBrowser` from `jobAnalyzer.ts`
- [ ] T022 [US1] Remove `VITE_OPENAI_API_KEY` validation check from `cvAnalyzer.ts`
- [ ] T023 [US1] Verify: `npx tsc --noEmit` — zero errors
- [ ] T024 [US1] Verify: test CV analysis works end-to-end with real file

**Checkpoint**: At this point, User Story 1 is complete — no API keys exposed in browser

---

## Phase 3: User Story 2 — Arquitetura & Testes (Priority: HIGH) 🟡

**Goal**: Refactor Login.tsx to use Tailwind, add test coverage for AI services

**Independent Test**: Login page must look identical before/after refactor. All new tests must pass.

### Tests for User Story 2

- [ ] T025 [P] [US2] Write test: cvAnalyzer extracts candidate name from text in `tests/unit/cvAnalyzer.test.ts`
- [ ] T026 [P] [US2] Write test: cvAnalyzer returns null email when absent in `tests/unit/cvAnalyzer.test.ts`
- [ ] T027 [P] [US2] Write test: cvAnalyzer sanitizes prompt injection in `tests/unit/cvAnalyzer.test.ts`
- [ ] T028 [P] [US2] Write test: jobAnalyzer extracts skills from description in `tests/unit/jobAnalyzer.test.ts`

### Implementation for User Story 2

- [ ] T029 [US2] Refactor Login.tsx — block 1: replace container external styles with Tailwind classes in `src/pages/auth/Login.tsx`
- [ ] T030 [US2] Refactor Login.tsx — block 2: replace left panel (illustration) styles with Tailwind in `src/pages/auth/Login.tsx`
- [ ] T031 [US2] Refactor Login.tsx — block 3: replace right panel (form card) styles with Tailwind in `src/pages/auth/Login.tsx`
- [ ] T032 [US2] Refactor Login.tsx — block 4: replace input fields and button styles with Tailwind in `src/pages/auth/Login.tsx`
- [ ] T033 [US2] Verify visually: Login page at 1920x1080 and 375x667 — must look identical
- [ ] T034 [P] [US2] Add `tests/unit/cvAnalyzer.test.ts` with extraction and sanitization tests
- [ ] T035 [P] [US2] Add `tests/unit/jobAnalyzer.test.ts` with skill extraction test

**Checkpoint**: User Story 2 complete — Login using Tailwind, AI services tested

---

## Phase 4: User Story 3 — Qualidade de Código (Priority: MEDIUM) 🟠

**Goal**: Consolidate duplicate code, remove unused deps, add CI, create docs

**Independent Test**: Build passes, CI workflow runs, `.env.example` documents all vars.

### Implementation for User Story 3

- [ ] T036 [P] [US3] Move `callOpenAI` into `src/core/services/aiClient.ts` and update imports in `cvAnalyzer.ts` and `jobAnalyzer.ts`
- [ ] T037 [P] [US3] Verify `three` dependency is not imported anywhere: `Select-String -Path src/**/*.ts,src/**/*.tsx -Pattern "from 'three'"` — if not found, run `npm uninstall three`
- [ ] T038 [P] [US3] Verify `@google/generative-ai` is not imported anywhere: `Select-String -Path src/**/*.ts,src/**/*.tsx -Pattern "generative-ai"` — if not found, run `npm uninstall @google/generative-ai`
- [ ] T039 [P] [US3] Create `.env.example` with all documented environment variables at project root — OpenAI documented as server-side (not VITE_)
- [ ] T040 [P] [US3] Rename `src/components/MagicRings.jsx` to `src/components/MagicRings.tsx` via `git mv`
- [ ] T041 [US3] Fix TypeScript errors in `src/components/MagicRings.tsx` (add `// @ts-nocheck` temporarily if needed)
- [ ] T042 [P] [US3] Create `.github/workflows/ci.yml` with lint → typecheck → test pipeline
- [ ] T043 [US3] Verify: `npm run build` — must pass

**Checkpoint**: User Story 3 complete — code consolidated, CI running, docs created

---

## Phase 5: User Story 4 — Polimento (Priority: LOW) 🔵

**Goal**: Structured logging, font optimization, security hardening, error handling

**Independent Test**: App does not crash on errors, fonts load without flash, no `console.log` in critical services.

### Implementation for User Story 4

- [ ] T044 [P] [US4] Expand `src/core/services/logger.ts` with `info()`, `error()`, `warn()` methods with context prefix
- [ ] T045 [US4] Replace `console.log`/`console.error` with `logger.info`/`logger.error` in `src/core/services/cvAnalyzer.ts`
- [ ] T046 [US4] Replace `console.log`/`console.error` with `logger.info`/`logger.error` in `src/core/services/jobAnalyzer.ts`
- [ ] T047 [US4] Replace `console.log`/`console.error` with `logger.info`/`logger.error` in `src/core/services/evolutionApi.ts`
- [ ] T048 [P] [US4] Add `import '@fontsource-variable/geist'` to `src/main.tsx`
- [ ] T049 [US4] Remove `loadFont()` function and `useEffect` from `src/pages/auth/Login.tsx`
- [ ] T050 [P] [US4] Create `src/core/utils/aiSecurity.ts` with expanded `sanitizeAIInput()` function and multi-language patterns
- [ ] T051 [US4] Replace `sanitizeAIInput()` in `cvAnalyzer.ts` with import from `aiSecurity.ts`
- [ ] T052 [P] [US4] Add `createEvolutionApi()` factory function in `src/core/services/evolutionApi.ts` that fetches credentials from Supabase
- [ ] T053 [P] [US4] Create `src/common/components/ErrorBoundary.tsx` with error fallback UI
- [ ] T054 [US4] Wrap `<App />` with `<ErrorBoundary>` in `src/main.tsx`

**Checkpoint**: User Story 4 complete — polished code, error handling, fonts

---

## Phase 6: Validação Final

**Purpose**: Verify everything works together

- [ ] T055 Run `npx tsc --noEmit` — zero errors
- [ ] T056 Run `npm run lint` — zero warnings
- [ ] T057 Run `npm test` — all tests passing
- [ ] T058 Run `npm run build` — build successful
- [ ] T059 Manual test: Login flow works
- [ ] T060 Manual test: CV analysis works with real file
- [ ] T061 Manual test: Pipeline drag-and-drop works
- [ ] T062 Manual test: Job listing and application works

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 0)**: No dependencies — start immediately
- **Foundational (Phase 1)**: Depends on Phase 0 — BLOCKS all user stories
- **US1 — Security (Phase 2)**: Depends on Phase 1 — CRITICAL path
- **US2 — Architecture (Phase 3)**: Depends on Phase 1 — can start after foundational
- **US3 — Code Quality (Phase 4)**: No dependencies on US1/US2 — can run in parallel
- **US4 — Polish (Phase 5)**: No dependencies — can run in parallel
- **Validation (Phase 6)**: Depends on ALL phases complete

### Parallel Opportunities

- All T00x tasks marked [P] can run in parallel
- Phase 4 (US3) and Phase 5 (US4) can run in parallel with Phase 2 (US1) and Phase 3 (US2)
- Within each phase, [P] tasks can run in parallel

### Suggested Order

```
Week 1: Phase 0 + Phase 1 + Phase 2 (Security)      → fast win
Week 2: Phase 3 (Architecture) + Phase 4 (Quality)    → parallel
Week 3: Phase 5 (Polish) + Phase 6 (Validation)       → finish
```

## Implementation Strategy

### MVP First (Phase 2 Only — Security)

1. Complete Phase 0: Setup
2. Complete Phase 1: Foundational
3. Complete Phase 2: User Story 1 (Security)
4. **STOP and VALIDATE**: No API keys in browser

### Incremental Delivery

1. Phase 0 + 1 + 2 → **Security fix deployed** (CRITICAL)
2. Add Phase 3 → **Architecture improved, tests added**
3. Add Phase 4 → **Code quality, CI, docs**
4. Add Phase 5 → **Polish, error handling**

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 58 |
| US1 (Security) tasks | 14 |
| US2 (Architecture) tasks | 11 |
| US3 (Code Quality) tasks | 8 |
| US4 (Polish) tasks | 11 |
| Validation tasks | 8 |
| Parallel opportunities | 15+ tasks marked [P] |
| Estimated effort | 17-23h |
