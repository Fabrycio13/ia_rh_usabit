# Implementation Plan: Nova Hierarquia de Perfis (Roles)

**Branch**: `nova-hierarquia-perfis` | **Date**: 2026-06-22 | **Spec**: `specs/nova-hierarquia-perfis/spec.md`

## Summary

Reestruturar a hierarquia de perfis do sistema: renomear "Gestor" para "Administrador" e adicionar o novo perfil "Supervisor" entre Administrador e {RH, Convidado}. O Supervisor tem as mesmas permissões do RH + acesso ao painel de logs/atividades + capacidade de criar/gerenciar RH e Convidado.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.x, PL/pgSQL

**Primary Dependencies**:
- Vite (bundler)
- Supabase JS Client (database + auth)
- PostgreSQL (tabela `profiles` com coluna `user_role`)

**Storage**: PostgreSQL (tabela `profiles`), Supabase RLS Policies

**Target Platform**: Web (React SPA)

**Constraints**:
- TypeScript strict mode
- ESLint `max-warnings 0`
- Não quebrar código existente fora do escopo
- Compatibilidade retroativa: perfis 'gestor' existentes no banco devem ser migrados para 'administrador'
- Supervisor deve ter `logs: true` e `admin: true` no mapa de permissões

## Nova Hierarquia

```
Owner → Administrador → Supervisor → {RH, Convidado}
```

### Regras de Criação

| Criador | Pode Criar |
|---------|------------|
| Owner | Administrador |
| Administrador | Supervisor, RH, Convidado |
| Supervisor | RH, Convidado |
| RH | Ninguém |
| Convidado | Ninguém |

### Permissões por Perfil

| Permissão | Owner | Administrador | Supervisor | RH | Convidado |
|-----------|-------|---------------|------------|-----|-----------|
| dashboard | true | true | true | true | false |
| vagas | true | true | true | true | true |
| vagas_edit | true | true | true | true | false |
| analises | true | true | true | true | false |
| analises_edit | true | true | true | true | false |
| candidatos | true | true | true | true | false |
| candidatos_edit | true | true | true | true | false |
| pipeline | true | true | true | true | true |
| pipeline_edit | true | true | true | true | false |
| chat | true | false | false | false | false |
| chat_widget | true | true | true | true | false |
| admin | true | true | true | false | false |
| logs | true | true | true | false | false |

## Estrutura de Arquivos

```
specs/nova-hierarquia-perfis/
├── plan.md              # Este arquivo
├── spec.md              # User stories e requisitos
├── research.md          # Decisões de design
├── data-model.md        # Entidades e campos
├── quickstart.md        # Guia de verificação
├── tasks.md             # Tarefas de implementação
└── 062_nova_hierarquia_supervisor.sql  # Migration SQL

src/
├── common/constants/
│   └── roleDefinitions.ts          ← Renomear gestor→administrador, add supervisor
├── core/
│   ├── config/
│   │   └── permissions.ts          ← Renomear gestor→administrador, add supervisor
│   └── contexts/
│       └── UserContext.tsx          ← Add 'supervisor' ao union type UserProfile.user_role
├── pages/
│   └── dashboard/
│       └── AdminDashboard.tsx       ← Atualizar canCreate e UI de criação/filtro
├── pages/
│   └── settings/
│       ├── Configuracoes.tsx        ← Renomear referências a gestor
│       └── OwnerPanels.tsx          ← Renomear gestor→administrador
├── layouts/
│   ├── Sidebar.tsx                  ← Nenhuma mudança (usa hasPermission)
│   └── DashboardLayout.tsx          ← Nenhuma mudança (usa hasPermission)
├── App.tsx                          ← Add 'supervisor' em redirects de convidado
├── pages/
│   ├── candidates/
│   │   ├── CandidateBank.tsx        ← Atualizar isOrgMember
│   │   └── Pipeline.tsx             ← Sem mudança (usa hasPermission)
│   ├── vagas/
│   │   └── Vagas.tsx                ← Sem mudança (usa role genérico)
│   ├── analysis/
│   │   └── Analises.tsx             ← Sem mudança (usa hasPermission)
│   ├── support/
│   │   └── Ajuda.tsx                ← Atualizar texto dos perfis
│   └── marketing/
│       └── LandingPage.tsx          ← Textos conceituais, sem mudança
├── features/
│   └── analysis/
│       └── CandidatePanel.tsx       ← Sem mudança
└── common/
    └── components/
        └── OnboardingModal.tsx       ← Add 'supervisor' à condição de onboarding

supabase/
├── migrations/
│   └── 062_nova_hierarquia_supervisor.sql  ← NOVA migration
└── functions/
    ├── send-invite-email/
    │   └── index.ts                 ← Atualizar hierarchy + lógica
    └── openai-proxy/
        └── index.ts                 ← Add 'supervisor' ao ALLOWED_ROLES
```

## Pontos de Atenção (Blind Spots)

| # | Blind Spot | Solução |
|---|------------|---------|
| 1 | Perfis 'gestor' existentes no banco de produção | Migration `062` faz `UPDATE profiles SET user_role = 'administrador' WHERE user_role = 'gestor'` |
| 2 | `send-invite-email` tem hierarchy numérica | Atualizar de `{ owner:4, gestor:3, rh:2, convidado:1 }` para `{ owner:5, administrador:4, supervisor:3, rh:2, convidado:1 }` |
| 3 | `openai-proxy` ALLOWED_ROLES não inclui supervisor | Adicionar `'supervisor'` ao array |
| 4 | Owner só pode criar Administrador (não mais gestor) | Atualizar `canCreate` em AdminDashboard e lógica de criação |
| 5 | Administrador agora cria Supervisor, RH e Convidado | Atualizar `canCreate` para administrador |
| 6 | Supervisor pode criar RH e Convidado | Adicionar nova regra no `canCreate` |
| 7 | `isOrgMember` precisa incluir 'supervisor' | Atualizar `['gestor', 'rh']` para `['administrador', 'supervisor', 'rh']` |
| 8 | `OnboardingModal` precisa exibir onboarding de setup para supervisor | Adicionar `'supervisor'` na condição |
| 9 | `Configuracoes.tsx` carrega usuários para gestor/owner | Adicionar `'supervisor'` e `'administrador'` |
| 10 | Todas as RLS policies com `get_my_role() = 'gestor'` | Migration cria novas policies para 'administrador' e 'supervisor' |
| 11 | `convidado_vaga_access` policies referenciam `'gestor'` | Migration atualiza para incluir 'administrador' e 'supervisor' |
| 12 | Ícone do Supervisor | Usar `UserCog` ou `UserCheck` do lucide-react |

## Dependências

1. Migration SQL `062_nova_hierarquia_supervisor.sql` deve ser executada primeiro (altera banco)
2. `send-invite-email` e `openai-proxy` (Edge Functions) podem ser atualizados em paralelo
3. Arquivos de tipagem/permissão (`roleDefinitions`, `permissions`, `UserContext`) devem ser atualizados antes dos componentes de UI
4. AdminDashboard depende dos tipos atualizados
5. OwnerPanels e Configuracoes dependem dos tipos atualizados
6. Ajuda.tsx e textos podem ser atualizados a qualquer momento

## Riscos

1. **Regressão de RLS**: Policies antigas referenciam `'gestor'` — a migration deve garantir que `'administrador'` tenha as mesmas permissões que `'gestor'` tinha, e `'supervisor'` tenha as mesmas que `'rh'` + logs
2. **Quebra de Edge Functions**: `send-invite-email` valida hierarchy — se não for atualizada, Admins não conseguirão criar Supervisores
3. **Usuários gestor existentes**: Migration lida com rename, mas perfis com `user_role = 'gestor'` em cache de sessão podem causar comportamento inesperado até o próximo login
4. **Testes manuais necessários**: CRUD de usuários, login com cada perfil, verificação de RLS em todas as tabelas principais
