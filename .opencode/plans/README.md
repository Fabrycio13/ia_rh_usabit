# Planos — Documentação do Projeto

> Planos de implementação organizados por **domínio**. Cada subpasta é uma área do projeto, e cada plano `.md` é uma tarefa específica.

## Estrutura

```
.opencode/plans/
├── README.md                  ← este arquivo
├── backend/                   ← Migrations, SQL, RLS, Edge Functions
├── frontend/                  ← Componentes React, UI, lint, mobile
├── design/                    ← Visual, layout, cores, banner
├── security/                  ← Auth, LGPD, pentest, hardening
├── tests/                     ← Planos de teste (Vitest, e2e, cobertura)
├── cleanup/                   ← Refactor, dedup, organização (ex: lint-errors)
└── orchestration/             ← Plano de processo (agentes, pipeline, tooling)
```

## Regra: onde colocar um plano novo?

Ao criar um plano, pergunte:

1. **É mudança no banco / Edge Function / RLS?** → `backend/`
2. **É componente React / página / bug visual UI?** → `frontend/`
3. **É redesign / cor / layout / banner?** → `design/`
4. **É auth / permissão / LGPD / pentest?** → `security/`
5. **É sobre adicionar testes ou cobertura?** → `tests/`
6. **É sobre organizar/refatorar código existente (sem mudar comportamento)?** → `cleanup/`
7. **É sobre o pipeline/process (agentes, tooling)?** → `orchestration/`
8. **É feature fullstack (UI + DB + lógica)?** → `feature/` ou categorize pelo impacto principal

## Naming convention

- `NNN_<feature>.md` quando tem número sequencial (PLAN-004, PLAN-008, PLAN-009)
- `<feature>_<acao>.md` sem número (banner-readme-visual, lint-errors-plan)
- Tudo em minúsculas, kebab-case
- Sufixo `-visual` se for plano do @design-planner

## Como agentes consultam

Cada agent filtra sua pasta no momento de planejar:

| Agent | Pasta primária |
|---|---|
| `@backend` | `backend/` + spec relevante em `.opencode/specs/<feature>/` |
| `@frontend` | `frontend/` + `design/` |
| `@design-planner` | `design/` |
| `@security` | `security/` |
| `@testador` | `tests/` + `backend/` + `frontend/` |
| `@orquestrador` | lê todas quando monta o pipeline |
