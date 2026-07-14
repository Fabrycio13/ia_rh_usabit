# Tasks: Isolamento de Dados Gestor vs RH

## Fase 1: Setup

- [ ] T001 Verificar se `pipeline_cards` tem coluna `organization_id` executando query SQL no banco remoto via Management API (`SELECT column_name FROM information_schema.columns WHERE table_name = 'pipeline_cards' AND column_name = 'organization_id'`)
- [ ] T002 [P] Criar branch de trabalho `git checkout -b feat/rh-gestor-isolamento`

## Fase 2: Fundação — Migration RLS 059

- [ ] T003 [P] Criar `supabase/migrations/059_rh_gestor_isolation.sql` com DROP e recriação da policy de `vagas_white_label`: gestor vê `organization_id = get_my_org_id()`, rh vê `user_id = auth.uid()`, owner vê tudo
- [ ] T004 [P] [T003] Adicionar à mesma migration as policies de `pipelines`: gestor vê `organization_id = get_my_org_id() OR user_id = auth.uid()`, rh vê `user_id = auth.uid()`
- [ ] T005 [P] [T003] Adicionar à mesma migration as policies de `pipeline_columns`: mesma lógica do pipelines
- [ ] T006 [P] [T001] Adicionar à mesma migration as policies de `pipeline_cards`: usar `organization_id` se existir, ou JOIN com pipelines como fallback
- [ ] T007 Aplicar migration 059 no banco remoto via Management API (`POST /v1/projects/{ref}/database/query`) e registrar em `schema_migrations` manualmente

## Fase 3: US1 — Dashboard isola vagas para RH

- [ ] T008 [US1] Em `src/pages/dashboard/Dashboard.tsx:249-250`, adicionar condicional: se `profile.user_role === 'rh'`, usar `.eq('user_id', profile.userId)`; senão (gestor/owner) manter `.or(organization_id.eq.X, user_id.eq.Y)`
- [ ] T009 [US1] Verificar que a contagem total de vagas no Dashboard (`jobs.length + whiteLabelData.length` em ~linha 208) reflete corretamente o filtro aplicado

## Fase 4: US2 — Listagem de vagas isolada para RH

- [ ] T010 [US2] Em `src/pages/vagas/Vagas.tsx:199-200`, adicionar condicional: se `role === 'rh'`, usar `.eq('user_id', user.id)`; senão manter `.or(organization_id.eq.X, user_id.eq.Y)`
- [ ] T011 [US2] Em `src/pages/vagas/Vagas.tsx:231-245`, adicionar guard no callback do Realtime: se `userRole === 'rh'` e `(payload.new as any).user_id !== userId`, ignorar INSERT (return)

## Fase 5: US3 — Pipeline isolado para RH

- [ ] T012 [US3] Em `src/pages/candidates/Pipeline.tsx:685-686`, adicionar condicional no `init()`: se `profile.user_role === 'rh'`, usar `.eq('user_id', userId)`; senão manter `.or(organization_id.eq.X, user_id.eq.Y)`
- [ ] T013 [US3] Em `src/pages/candidates/Pipeline.tsx:724-744`, adicionar no `loadAvailableVagas()`: se `profile.user_role === 'rh'`, adicionar `.eq('user_id', profile.userId)` à query

## Fase 6: Validação

- [ ] T014 Rodar `npx tsc --noEmit` — 0 erros
- [ ] T015 Rodar `npx eslint --max-warnings 0 .` — 0 warnings
- [ ] T016 Rodar `npx vite build` — build bem-sucedido
- [ ] T017 Fazer commit e push (`git add -A && git commit -m "feat: isolate rh data from gestor in dashboard, vagas, pipeline" && git push`)

## Dependências entre User Stories

```
US1 (Dashboard) ── independente
US2 (Vagas) ────── independente
US3 (Pipeline) ─── independente
```

Todas as 3 US são independentes e podem ser implementadas em paralelo após a migration (Fase 2).

## Execução Paralela

Após T007 (migration aplicada), T008-009 (US1), T010-011 (US2), e T012-013 (US3) podem ser executados em paralelo.

## Estratégia de Implementação

**MVP**: Fases 1 → 2 → 3 (Dashboard) já resolve o problema mais crítico (contagem errada). Fases 4 e 5 são complementares. Recomenda-se fazer tudo de uma vez pois as mudanças são pequenas e localizadas.
