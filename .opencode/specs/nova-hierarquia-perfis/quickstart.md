# Quickstart: Nova Hierarquia de Perfis

## Pré-requisitos

- Acesso ao Supabase project (ref: `dfsqdfetzcwvmfphljzs`)
- Terminal com `npx supabase` configurado
- Projeto rodando localmente (`npm run dev`)

## Passos Rápidos

### 1. Migration do Banco

```bash
# Opção A: Via CLI
npx supabase db push

# Opção B: Via SQL Editor (Supabase Dashboard)
# Copiar e colar o conteúdo de:
# specs/nova-hierarquia-perfis/062_nova_hierarquia_supervisor.sql
```

### 2. Verificar Migration

```sql
-- Deve mostrar: owner, administrador, rh, convidado (sem 'gestor')
SELECT user_role, COUNT(*) FROM profiles GROUP BY user_role ORDER BY user_role;
```

### 3. Atualizar Código Fonte

Os arquivos a modificar estão listados em `tasks.md`. Ordem sugerida:

```
src/common/constants/roleDefinitions.ts
src/core/config/permissions.ts
src/core/contexts/UserContext.tsx
src/pages/dashboard/AdminDashboard.tsx
src/pages/settings/Configuracoes.tsx
src/pages/settings/OwnerPanels.tsx
src/common/components/OnboardingModal.tsx
src/pages/support/Ajuda.tsx
src/pages/candidates/CandidateBank.tsx
```

### 4. Deploy Edge Functions

```bash
npx supabase functions deploy send-invite-email
npx supabase functions deploy openai-proxy
```

### 5. Build e Verificação

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Checklist de Verificação Manual

- [ ] Owner consegue criar Administrador (não mais "Gestor")
- [ ] Administrador consegue criar Supervisor, RH e Convidado
- [ ] Supervisor consegue criar RH e Convidado
- [ ] RH e Convidado NÃO conseguem criar ninguém
- [ ] Supervisor vê painel de logs/atividades
- [ ] Supervisor vê módulo de administração/configurações
- [ ] RH não vê logs nem admin
- [ ] Convidado tem acesso somente leitura
- [ ] Badges e labels mostram "Administrador" (não "Gestor")
- [ ] Dropdown de filtro de perfil inclui Supervisor e Administrador
- [ ] Onboarding correto para cada perfil
