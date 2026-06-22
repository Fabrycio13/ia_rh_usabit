# Spec: Nova Hierarquia de Perfis

## Contexto

Atualmente o sistema possui 4 perfis: `Owner`, `Gestor`, `RH`, `Convidado`. Com a evolução da plataforma, surgiu a necessidade de:

1. Renomear "Gestor" para "Administrador" — nome mais claro para o admin da organização
2. Criar o perfil "Supervisor" — um cargo intermediário entre Administrador e RH/Convidado, que tem visibilidade dos logs de atividades do RH e pode gerenciar RH e Convidados

## Regras de Negócio

| Regra | Descrição |
|-------|-----------|
| RN-01 | O perfil "Gestor" é renomeado para "Administrador" em toda a interface |
| RN-02 | Usuários existentes com `user_role = 'gestor'` são migrados para `'administrador'` |
| RN-03 | O novo perfil "Supervisor" é adicionado entre Administrador e {RH, Convidado} |
| RN-04 | Supervisor tem as mesmas permissões que RH + acesso ao painel de logs/atividades |
| RN-05 | Supervisor pode criar e gerenciar usuários dos perfis RH e Convidado |
| RN-06 | Owner cria apenas Administradores (não mais Gestores) |
| RN-07 | Administrador cria Supervisor, RH e Convidado |
| RN-08 | A hierarquia numérica (usada em Edge Functions) é atualizada |
| RN-09 | Supervisor é adicionado ao `ALLOWED_ROLES` do proxy OpenAI |
| RN-10 | Supervisor tem acesso ao módulo de admin da organização (painel de configurações) |

## User Stories

### US1 (P1): Renomear "Gestor" para "Administrador"
**Como** Owner/Administrador
**Quero** que o perfil "Gestor" seja exibido como "Administrador" em toda a interface
**Para** que o nome reflita melhor a função de admin da organização

**Critérios de Aceitação:**
- CA-01: `roleDefinitions` usa `key: 'administrador'` e `label: 'Administrador'`
- CA-02: `rolePermissions` tem entry `administrador` (cópia do antigo `gestor`)
- CA-03: `UserProfile.user_role` union type inclui `'administrador'`
- CA-04: Todas as referências a `'gestor'` no frontend são substituídas por `'administrador'`
- CA-05: Label "Gestor" não aparece mais em dropdowns, cards, badges
- CA-06: Ícone do Administrador continua `Briefcase`

### US2 (P1): Adicionar perfil "Supervisor"
**Como** Administrador
**Quero** poder criar usuários com o perfil "Supervisor"
**Para** que eles possam supervisionar as atividades do RH

**Critérios de Aceitação:**
- CA-07: `roleDefinitions` tem novo entry com `key: 'supervisor'`, `label: 'Supervisor'`
- CA-08: `rolePermissions` tem entry `supervisor` com `logs: true` e `admin: true`
- CA-09: `UserProfile.user_role` union type inclui `'supervisor'`
- CA-10: Supervisor aparece nas opções de criação de usuário para Owner e Administrador
- CA-11: Supervisor aparece no filtro de perfis do AdminDashboard

### US3 (P1): Supervisor pode criar RH e Convidado
**Como** Supervisor
**Quero** poder criar usuários RH e Convidado
**Para** gerenciar a equipe operacional

**Critérios de Aceitação:**
- CA-12: `canCreate('supervisor')` retorna `['rh', 'convidado']`
- CA-13: UI de criação mostra apenas RH e Convidado quando o criador é Supervisor
- CA-14: Edge Function `send-invite-email` permite Supervisor criar RH e Convidado

### US4 (P1): Supervisor vê logs de atividades do RH
**Como** Supervisor
**Quero** acessar o painel de logs e atividades para ver o que o RH fez
**Para** supervisionar e auditar as ações da equipe

**Critérios de Aceitação:**
- CA-15: `rolePermissions.supervisor.logs = true`
- CA-16: `rolePermissions.supervisor.admin = true`
- CA-17: Módulo de administração (configurações) fica visível para Supervisor
- CA-18: Logs de atividade incluem ações de todos os usuários RH da organização

### US5 (P2): Atualizar RLS policies do banco
**Como** Sistema
**Quero** que o banco de dados reconheça os novos perfis `'administrador'` e `'supervisor'`
**Para** que as políticas de segurança funcionem corretamente

**Critérios de Aceitação:**
- CA-19: Migration `062` migra `gestor` → `administrador` na tabela `profiles`
- CA-20: Migration cria novas RLS policies para `'administrador'` (copiando as de `'gestor'`)
- CA-21: Migration cria RLS policies para `'supervisor'` (copiando as de `'rh'` + `'gestor'` para logs)
- CA-22: Migration atualiza `convidado_vaga_access` policies para incluir `'administrador'` e `'supervisor'`
- CA-23: `get_my_role()` function continua funcionando sem alterações

### US6 (P2): Atualizar textos de ajuda e landing page
**Como** Usuário
**Quero** que os textos de ajuda reflitam os novos perfis
**Para** ter documentação atualizada

**Critérios de Aceitação:**
- CA-24: Página de Ajuda lista os 5 perfis: Owner, Administrador, Supervisor, RH, Convidado
- CA-25: Descrições dos perfis estão corretas

## Restrições Técnicas

- TypeScript strict mode
- ESLint com `max-warnings 0`
- Não quebrar código existente fora do escopo
- Compatibilidade retroativa: chave `'gestor'` é removida, `'administrador'` a substitui
- Migration deve ser idempotente (pode rodar múltiplas vezes)
