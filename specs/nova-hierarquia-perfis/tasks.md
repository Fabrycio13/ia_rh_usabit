# Tasks: Nova Hierarquia de Perfis

**Input**: Design documents from `specs/nova-hierarquia-perfis/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Organization**: Tasks grouped by layer (DB → Core → UI → Functions)

---

## Format: `[ID] [P?] [Layer] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Layer]**: DB / Core / UI / Functions

---

## Phase 1: Database — Migration SQL

**Purpose**: Executar migration no banco para renomear gestor→administrador e criar novas RLS policies.

- [ ] T001 [DB] Executar `062_nova_hierarquia_supervisor.sql` no Supabase via `npx supabase db push` ou SQL editor
- [ ] T002 [DB] Verificar distribuição: `SELECT user_role, COUNT(*) FROM profiles GROUP BY user_role`
- [ ] T003 [DB] Verificar se policies antigas de 'gestor' foram removidas: `SELECT * FROM pg_policies WHERE cmd ILIKE '%gestor%'`

**Checkpoint**: Banco com perfis administrador + supervisor + RLS atualizadas

---

## Phase 2: Core Types & Constants

**Purpose**: Atualizar definições de tipos e constantes no frontend.

### T004-T006: `roleDefinitions.ts`

- [x] T004 [P] [Core] Renomear entry `gestor` → `administrador` em `src/common/constants/roleDefinitions.ts:28-42`
- [x] T005 [P] [Core] Adicionar entry `supervisor` em `src/common/constants/roleDefinitions.ts` após `administrador`
- [x] T006 [P] [Core] Atualizar descrição do Owner: "Criar e gerenciar administradores" (antes "gestores")

**Detalhes do Supervisor**:
```typescript
{
    key: 'supervisor',
    label: 'Supervisor',
    icon: UserCog,
    color: '#8b5cf6',  // roxo
    description: 'Supervisiona a equipe operacional. Acesso a logs e atividades do RH.',
    permissions: [
        'Criar e gerenciar RH e Convidados',
        'Acesso operacional completo (vagas, análises, candidatos)',
        'Painel de logs e atividades',
        'Visualizar relatórios de análise'
    ]
}
```

### T007-T009: `permissions.ts`

- [x] T007 [P] [Core] Renomear entry `gestor` → `administrador` em `src/core/config/permissions.ts:39-53`
- [x] T008 [P] [Core] Adicionar entry `supervisor` em `src/core/config/permissions.ts` (cópia de rh + logs:true + admin:true)
- [x] T009 [P] [Core] Atualizar helpers: `isOrgMember` incluir `'administrador'` e `'supervisor'`

**Detalhes do Supervisor**:
```typescript
supervisor: {
    dashboard: true,
    vagas: true,
    vagas_edit: true,
    analises: true,
    analises_edit: true,
    candidatos: true,
    candidatos_edit: true,
    pipeline: true,
    pipeline_edit: true,
    chat: false,
    chat_widget: true,
    admin: true,
    logs: true,
},
```

**isOrgMember**:
```typescript
export const isOrgMember = (role: string): boolean =>
    ['administrador', 'supervisor', 'rh'].includes(role);
```

### T010: `UserContext.tsx`

- [x] T010 [Core] Atualizar union type `user_role` em `src/core/contexts/UserContext.tsx:14` para incluir `'administrador'` e `'supervisor'`
- [x] T010b [Core] Atualizar validações de role nas linhas 60-62 e 106-111 para incluir os novos perfis

**Checkpoint**: `npx tsc --noEmit` passa sem erros

---

## Phase 3: UI — AdminDashboard (CRUD de Usuários)

**Purpose**: Atualizar lógica de criação, filtro e exibição de usuários.

### T011-T014: Lógica de criação

- [ ] T011 [UI] Atualizar `canCreate` em `src/pages/dashboard/AdminDashboard.tsx:335-339`:

```typescript
const canCreate = (creatorRole: string, targetRole: string): boolean => {
    if (creatorRole === 'owner') return targetRole === 'administrador';
    if (creatorRole === 'administrador') return ['supervisor', 'rh', 'convidado'].includes(targetRole);
    if (creatorRole === 'supervisor') return ['rh', 'convidado'].includes(targetRole);
    return false;
};
```

- [ ] T012 [UI] Atualizar mensagem de erro em `AdminDashboard.tsx:342`:
```typescript
const allowed = userRole === 'owner' ? 'Administrador' :
                userRole === 'administrador' ? 'Supervisor, RH ou Convidado' :
                'RH ou Convidado';
```

- [ ] T013 [UI] Atualizar `isCreatingGestor` → `isCreatingAdmin` em `AdminDashboard.tsx:349` e lógica de `organizationId`:
```typescript
const isCreatingAdmin = newUser.user_role === 'administrador';
const creatorIsOwner = userRole === 'owner';
if (creatorIsOwner && isCreatingAdmin) {
    organizationId = null;
    organizationName = null;
}
```

- [ ] T014 [UI] Atualizar dropdown de roleFilter em `AdminDashboard.tsx:723` — trocar "GESTOR" por "ADMIN" e adicionar "SUPERVISOR"

### T015-T017: Filtro e exibição

- [ ] T015 [UI] Atualizar filtro de roleFilter para incluir `'supervisor'` e `'administrador'`

- [ ] T016 [UI] Atualizar roleDefinitions iteration em `AdminDashboard.tsx:1094-1097` para novo canCreate

- [ ] T017 [UI] Atualizar seção de organização (OwnerPanels) que filtra gestores

**Checkpoint**: AdminDashboard funcional — Owner cria Admin, Admin cria Supervisor/RH/Conv, Supervisor cria RH/Conv

---

## Phase 4: UI — Settings & Configurações

- [ ] T018 [UI] Atualizar `src/pages/settings/Configuracoes.tsx`:
  - Linha 234: `isGestor` → `isAdmin` (usar `profile.user_role === 'administrador'`)
  - Linha 393: incluir `'administrador'` e `'supervisor'` no carregamento de usuários
  - Linha 396: tratar `'administrador'` e `'supervisor'` para carregar por org

- [ ] T019 [UI] Atualizar `src/pages/settings/OwnerPanels.tsx`:
  - Renomear `gestores` → `admins`, `Nenhum gestor` → `Nenhum administrador`
  - Filtrar por `user_role === 'administrador'`

---

## Phase 5: UI — Outros componentes

- [ ] T020 [P] [UI] Atualizar `src/common/components/OnboardingModal.tsx:17` para incluir `'supervisor'` no onboarding type 'setup'

```typescript
const onboardingType = (profile.user_role === 'owner' || profile.user_role === 'administrador' || profile.user_role === 'supervisor') ? 'setup' : 'welcome';
```

- [ ] T021 [P] [UI] Atualizar `src/pages/support/Ajuda.tsx:216` para listar os 5 perfis

- [ ] T022 [P] [UI] Atualizar `src/pages/candidates/CandidateBank.tsx:182` — `isOrgMember` (já usa helper, só precisa do helper correto)

---

## Phase 6: Edge Functions

- [ ] T023 [Functions] Atualizar `supabase/functions/send-invite-email/index.ts:60` — hierarchy numérica:

```typescript
const hierarchy: Record<string, number> = {
    owner: 5, administrador: 4, supervisor: 3, rh: 2, convidado: 1
};
```

- [ ] T024 [Functions] Atualizar `supabase/functions/openai-proxy/index.ts:9` — ALLOWED_ROLES:

```typescript
const ALLOWED_ROLES = ['rh', 'supervisor', 'gestor', 'administrador', 'owner'];
```

**Nota**: Manter `'gestor'` no ALLOWED_ROLES por compatibilidade com sessões existentes que ainda podem ter o papel 'gestor' no metadata até o próximo login.

- [ ] T025 [Functions] Deploy das functions atualizadas:
```
npx supabase functions deploy send-invite-email
npx supabase functions deploy openai-proxy
```

**Checkpoint**: Edge functions com suporte aos novos perfis

---

## Phase 7: Build Validation

- [ ] T026 Executar `npx tsc --noEmit` e corrigir erros de tipo
- [ ] T027 Executar `npm run lint` e corrigir warnings/erros
- [ ] T028 Executar `npm run build` e verificar build bem-sucedido

**Checkpoint**: Build 100% funcional, zero erros, zero warnings

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (DB)**: Sem dependências de código — pode ser executado primeiro
- **Phase 2 (Core)**: Independente — pode ser feito em paralelo com Phase 1
- **Phase 3 (AdminDashboard)**: Depende de Phase 2 (tipos atualizados)
- **Phase 4 (Settings)**: Depende de Phase 2 (tipos atualizados)
- **Phase 5 (Outros UI)**: Depende de Phase 2
- **Phase 6 (Functions)**: Independente do frontend — pode ser feito em paralelo
- **Phase 7 (Build)**: Depende de todas as fases anteriores

### Parallel Opportunities
- T004 a T010 podem rodar em paralelo (Phase 2 — arquivos diferentes)
- T020 a T022 podem rodar em paralelo (Phase 5 — arquivos diferentes)
- T023 a T025 (Phase 6) podem rodar em paralelo com Phase 3-5

### Ordem recomendada

```
FASE 1 (DB)
  T001 → T002 → T003

FASE 2 (Core, paralelo)
  T004 → T005 → T006  (roleDefinitions)
  T007 → T008 → T009  (permissions)
  T010                (UserContext)

FASE 3 + 4 + 5 (UI, paralelo entre arquivos)
  T011 → T012 → T013 → T014 → T015 → T016 → T017  (AdminDashboard)
  T018 → T019                                       (Settings)
  T020 → T021 → T022                                (Outros)

FASE 6 (Functions, paralelo com UI)
  T023 → T024 → T025

FASE 7 (Build)
  T026 → T027 → T028
```

---

## Notes

- `'gestor'` removido como perfil válido. Migration cuida dos dados existentes.
- `'supervisor'` é NOVO perfil. Não existe no banco antes da migration.
- Compatibilidade: manter `'gestor'` em `ALLOWED_ROLES` do openai-proxy temporariamente para não quebrar sessões ativas.
- O ícone `UserCog` precisa ser importado do `lucide-react` em `roleDefinitions.ts`.
- A migration deve ser feita ANTES de dar deploy das novas Edge Functions, para evitar que a hierarchy numérica referencie 'administrador' que ainda não existe no banco (embora a function use a hierarchy definida no código, não no banco).
