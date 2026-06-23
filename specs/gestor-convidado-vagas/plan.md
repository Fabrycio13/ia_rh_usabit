# Plano de Implementação: Permissionamento granular de Vagas para Convidado

**Branch:** `fix/remediation-sprint`

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React/TS)                   │
│  Configuracoes.tsx    Pipeline.tsx    CandidatePanel.tsx │
│  (Gestor: checkbox)  (read-only)     (guards view-only) │
└──────────────────────┬──────────────────────────────────┘
                       │ Supabase SDK (RLS aplicado)
┌──────────────────────▼──────────────────────────────────┐
│                    Supabase (PostgreSQL)                  │
│  convidado_vaga_access  +  RLS policies p/ 7 tabelas    │
│  (tabela de permissão)   (SELECT only para convidado)   │
└─────────────────────────────────────────────────────────┘
```

## Fases de Implementação

### Fase 1: Banco de Dados
- Migration `058_convidado_vaga_access.sql`
- Tabela + índices + RLS + function helper

### Fase 2: Permissions Config
- `permissions.ts`: `pipeline: true` para Convidado

### Fase 3: Pipeline Read-Only
- `Pipeline.tsx`: filtros de dados + DnD off + botões ocultos

### Fase 4: Gestor UI
- `Configuracoes.tsx`: seção "Vagas Permitidas" com checkboxes

### Fase 5: CandidatePanel View-Only
- `CandidatePanel.tsx`: guards no save/blacklist/mover

### Fase 6: Validação
- ESLint + TypeScript + Build

## Tabelas do Banco

### `convidado_vaga_access`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | Primary key |
| convidado_user_id | UUID FK → profiles(id) | Usuário convidado |
| vaga_id | UUID FK → vagas_white_label(id) | Vaga permitida |
| created_by | UUID FK → profiles(id) | Gestor que concedeu |
| created_at | TIMESTAMPTZ | Data da concessão |

UNIQUE(convidado_user_id, vaga_id)

## RLS Policies Adicionadas

| Tabela | Policy | Descrição |
|--------|--------|-----------|
| convidado_vaga_access | cva_gestor_* | Gestor/owner: CRUD na org |
| convidado_vaga_access | cva_convidado_select | Convidado: SELECT próprio |
| vagas_white_label | vwl_convidado_select | SELECT via get_convidado_vaga_ids() |
| pipelines | pipelines_convidado_select | SELECT via get_convidado_vaga_ids() |
| pipeline_columns | pcols_convidado_select | SELECT via pipeline → vaga |
| pipeline_cards | pcards_convidado_select | SELECT via pipeline → vaga |
| vagas_candidaturas | vc_convidado_select | SELECT via get_convidado_vaga_ids() |
| candidates | candidates_convidado_select | SELECT via pipeline_cards → vaga |
| candidate_screening_logs | csl_convidado_select | SELECT via candidates → pipeline → vaga |

## Fluxo do Convidado

```
Login → /vagas (só vagas permitidas)
  → Clica vaga → /vagas/:id/candidatos
  → Sidebar > Pipeline (só pipelines vinculados, read-only)
  → Clica card → CandidatePanel (view-only)
```
