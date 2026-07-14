# Research: Nova Hierarquia de Perfis

## Decisões de Design

### D01: Renomear chave `'gestor'` para `'administrador'` vs manter `'gestor'` como chave interna

**Decision**: Renomear a chave de `'gestor'` para `'administrador'` em todo o código + migration no banco.

**Rationale**: Manter a chave `'gestor'` internamente e apenas mudar o label causaria confusão técnica — o nome não corresponderia à função. Como é uma reestruturação planejada, é melhor fazer a migração completa de uma vez. A migration `062` cuida dos registros existentes no banco.

**Alternatives considered**:
- Apenas mudar o label `'Gestor'` → `'Administrador'` mantendo `key: 'gestor'` — rejeitado por inconsistência técnica
- Criar `'administrador'` como novo perfil e deprecated `'gestor'` — rejeitado por complexidade adicional

### D02: Supervisor herdar permissões do RH + logs vs ter permissões próprias

**Decision**: Supervisor copia as permissões do RH (`dashboard`, `vagas`, `vagas_edit`, `analises`, `analises_edit`, `candidatos`, `candidatos_edit`, `pipeline`, `pipeline_edit`, `chat_widget`) e adiciona `logs: true` e `admin: true`.

**Rationale**: O Supervisor precisa fazer TUDO que o RH faz (operacional completo) + supervisionar. Dar `admin: true` permite acesso ao painel de configurações da organização. Dar `logs: true` permite ver o log de atividades.

**Alternatives considered**:
- Criar permissões específicas de supervisão — rejeitado por complexidade desnecessária

### D03: Supervisor poder criar RH e Convidado

**Decision**: Supervisor pode criar RH e Convidado, mesma regra do Administrador para esses perfis.

**Rationale**: O papel do Supervisor inclui gerenciar a equipe operacional. Sem essa permissão, ele seria apenas um RH com logs.

### D04: Ícone do Supervisor

**Decision**: Usar `UserCog` do lucide-react (engrenagem sobre usuário = supervisor/administrativo).

**Rationale**: `UserCog` transmite a ideia de "usuário que configura/gerencia". Alternativas como `UserCheck` (aprovador) ou `UserShield` (muito próximo de Owner) não capturam bem o papel.

### D05: Tratamento de RLS no banco

**Decision**: Migration cria novas policies para `'administrador'` e `'supervisor'` baseadas nas policies existentes de `'gestor'` e `'rh'`, respectivamente.

**Rationale**: As policies de `'gestor'` dão acesso total à organização. `'administrador'` deve ter o mesmo. As policies de `'rh'` dão acesso operacional. `'supervisor'` deve ter o mesmo + acesso a logs. Policies antigas de `'gestor'` são removidas e substituídas.

### D06: Compatibilidade com Edge Functions

**Decision**: Atualizar `send-invite-email` com nova hierarquia numérica e `openai-proxy` com novo ALLOWED_ROLES.

**Rationale**: `send-invite-email` valida se o caller pode criar o target role pela hierarchy numérica. Sem a atualização, Administrador não conseguiria criar Supervisor. `openai-proxy` precisa incluir Supervisor para que ele possa usar análise de IA.

## Dependências e Integrações

| Dependência | Uso | Já existe? |
|-------------|-----|------------|
| `roleDefinitions` | Definições de perfil (label, ícone, cor) | Sim (precisa de rename + add) |
| `rolePermissions` | Mapa de permissões | Sim (precisa de rename + add) |
| `UserContext.tsx` | Union type `user_role` | Sim (precisa de add) |
| `AdminDashboard.tsx` | CRUD de usuários + hierarquia | Sim (precisa de atualização) |
| `send-invite-email` | Hierarchy validation | Sim (precisa de atualização) |
| `openai-proxy` | Role validation | Sim (precisa de add) |
| `OnboardingModal.tsx` | Onboarding por perfil | Sim (precisa de add) |
| `OwnerPanels.tsx` | Listagem de gestores→admins | Sim (precisa de rename) |
| `Configuracoes.tsx` | Tab visibility + user listing | Sim (precisa de atualização) |
| Migration SQL | RLS policies + data migration | Nova |
