# Tasks: Permissionamento granular de Vagas para Convidado

## T1: Migration Database ✅

**Arquivo:** `supabase/migrations/058_convidado_vaga_access.sql`

**Descrição:** Criar tabela `convidado_vaga_access`, índices, RLS policies para gestor/owner/convidado, e function helper `get_convidado_vaga_ids()`. Adicionar RLS policies SELECT para `convidado` em: `vagas_white_label`, `pipelines`, `pipeline_columns`, `pipeline_cards`, `vagas_candidaturas`, `candidates`, `candidate_screening_logs`.

**Verificação:** `npx supabase migration up`

---

## T2: Atualizar Permissions Config ✅

**Arquivo:** `src/core/config/permissions.ts`

**Descrição:** Alterar `pipeline: false` → `pipeline: true` no perfil `convidado`.

**Verificação:** `npx eslint .` — apenas 1 warning pré-existente.

---

## T3: Pipeline.tsx — Filtros + View-Only

**Arquivo:** `src/pages/candidates/Pipeline.tsx`

**Descrição:**
- Filtrar pipelines carregados via `init()`: buscar `convidado_vaga_access` e usar `.in('vaga_id', vagaIds)`. Tratar `organization_id` nulo com fallback `eq('user_id', userId)`.
- Filtrar `loadAvailableVagas()` para convidado: `in('id', vagaIds)`.
- Pular `loadEligibles()` se convidado.
- Adicionar `if (isConvidado) return;` nos 3 useEffects de drag-and-drop.
- Esconder botões: "Novo Processo", "Nova Coluna", "Vincular/Desvincular vaga", "Adicionar Candidato", delete pipeline, context menu de card.

**Verificação:** `npx tsc -b`

---

## T4: Configuracoes.tsx — Vagas Permitidas

**Arquivo:** `src/pages/settings/Configuracoes.tsx`

**Descrição:** Adicionar componente `VagasPermitidasSection` dentro da seção "Minha Equipe" quando o usuário selecionado é `convidado`. Carregar vagas da org + permissões atuais, renderizar checkboxes, salvar via DELETE + INSERT.

**Verificação:** `npx eslint .`

---

## T5: CandidatePanel.tsx — Guards View-Only

**Arquivo:** `src/features/analysis/CandidatePanel.tsx`

**Descrição:** Adicionar `if (profile.user_role === 'convidado') return;` no início de `handleFieldSave()` e `toggleBlacklist()`. Esconder botão "Mover para Banco de Talentos" se convidado.

**Verificação:** `npx tsc -b`

---

## T6: Validação Final

**Comandos:**
```bash
npx eslint . --max-warnings 0
npx tsc -b
npx vite build
```

**Critérios:** 0 erros ESLint, 0 erros TypeScript, build bem-sucedido.

---

## Ordem de Execução

```
T1 ── Migration
 │
 ├──→ T2 ── permissions.ts
 │
 ├──→ T3 ── Pipeline.tsx
 │
 ├──→ T4 ── Configuracoes.tsx
 │
 └──→ T5 ── CandidatePanel.tsx
        │
        └──→ T6 ── Validação Final
```

T2, T3, T4 e T5 podem ser executados em paralelo após T1 (afetam arquivos diferentes).
