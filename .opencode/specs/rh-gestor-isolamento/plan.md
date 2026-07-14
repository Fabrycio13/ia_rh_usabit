# Plano: Isolamento de Dados Gestor vs RH

## Stack

- **Frontend**: React 18, TypeScript, Vite, Supabase JS Client
- **Backend**: Supabase (PostgreSQL + RLS)
- **Database**: PostgreSQL com RLS policies

## Estrutura de Arquivos

```
src/
  pages/
    dashboard/Dashboard.tsx         ← Query de vagas (FR-01)
    vagas/Vagas.tsx                 ← Query + Realtime (FR-02, FR-03)
    candidates/
      Pipeline.tsx                  ← init() + loadAvailableVagas() (FR-04, FR-05)
      CandidateBank.tsx            ← SEM ALTERAÇÕES (FR-07)
      CandidatePanel.tsx           ← SEM ALTERAÇÕES
supabase/
  migrations/
    059_rh_gestor_isolation.sql     ← RLS policies (FR-06)
```

## Visão Geral das Alterações

### Frontend — 4 pontos de mudança

| Arquivo | Função/Local | Linha | Mudança |
|---------|-------------|-------|---------|
| `Dashboard.tsx` | Query de `vagas_white_label` | ~249 | Se `rh`, trocar `OR(org_id, user_id)` por `eq(user_id)` |
| `Vagas.tsx` | Query principal `fetchInitialData` | ~199 | Se `rh`, trocar `OR(org_id, user_id)` por `eq(user_id)` |
| `Vagas.tsx` | Callback do Realtime subscription | ~231 | Se `rh`, ignorar INSERT se `user_id` não for o próprio |
| `Pipeline.tsx` | `init()` | ~685 | Se `rh`, trocar `OR(org_id, user_id)` por `eq(user_id)` |
| `Pipeline.tsx` | `loadAvailableVagas()` | ~724 | Se `rh`, adicionar `eq(user_id)` |

### RLS — 1 migration

Criar `059_rh_gestor_isolation.sql` com DROP + CREATE para:
- `vagas_white_label` — policy atualizada
- `pipelines` — policy atualizada  
- `pipeline_columns` — policy atualizada
- `pipeline_cards` — policy atualizada

### Sem alteração

- `CandidateBank.tsx` — mantém `eq(organization_id)` para ambos
- `CandidatePanel.tsx` — sem mudanças
- `permissions.ts` — permissões já estão corretas
- Sidebar/Rotas — já usam `hasPermission()`
- Formulários de criação — já salvam `user_id` e `organization_id`

## Dependências

1. Migration 059 deve ser criada antes ou junto com as mudanças de frontend
2. As 4 mudanças de frontend são independentes entre si (podem ser feitas em paralelo)
3. Nenhuma blocking task externa

## Riscos

1. **pipeline_cards pode não ter `organization_id`** — verificar antes de criar RLS
2. **Realtime subscription no Vagas.tsx** pode vazar dados do gestor para RH se não for ajustado
3. **Pipelines antigos sem `organization_id`** — gestor mantém `OR` para evitar perda de dados
