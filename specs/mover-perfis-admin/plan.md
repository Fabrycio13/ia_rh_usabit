# Plano: Mover "Perfis" de Configurações para Painel Administrador

**Spec**: `specs/mover-perfis-admin/` | **Status**: Rascunho

---

## 1. Problema

Hoje o gerenciamento de usuários está fragmentado em duas páginas:

| Página | O que faz | Quem vê |
|--------|-----------|---------|
| `/admin` (AdminDashboard) | Lista usuários, toggle ativar/desativar, gráficos | Owner (e Gestor? — ver isolamento) |
| `/configuracoes` → aba "Perfis" | Convida novos usuários, gerencia permissão de vagas (convidado), reenvia convite, visão agrupada por org (Owner) | Owner + Gestor (RH/Convidado veem "Acesso Restrito") |

Isso causa duplicação de propósito, confusão do usuário e manutenção duplicada de lógica similar.

---

## 2. Objetivo

Unificar **todo** o gerenciamento de usuários (listar, convidar, ativar/desativar, editar perfil, reenviar convite, gerenciar vagas de convidados) no `/admin` (Painel Administrador) e remover a aba "Perfis" de Configurações.

---

## 3. Stack

- React 19, TypeScript 5.x, Vite
- Supabase JS Client (autenticação + banco + edge functions)
- react-hot-toast (notificações)
- lucide-react (ícones)
- react-router-dom (navegação hash)

---

## 4. Arquivos Envolvidos

### Arquivos a modificar

| Arquivo | Linhas | Mudança |
|---------|--------|---------|
| `src/pages/dashboard/AdminDashboard.tsx` | ~705 → ~1200 | Adicionar modais de criação + vagas, colunas de ação na tabela, visão agrupada p/ Owner |
| `src/pages/settings/Configuracoes.tsx` | ~2118 → ~1550 | Remover aba "Perfis", estados/handlers relacionados, `roleDefinitions` |
| `src/pages/settings/OwnerPanels.tsx` | ~379 | `AdminUser` continua exportado (já é usado) |
| `src/layouts/Sidebar.tsx` | ~620 | Navegação "Configurações" continua (ainda tem Perfil/Senha/Aparência/API/Plano) |

### Arquivos novos (opcional)

| Arquivo | Motivo |
|---------|--------|
| `src/pages/dashboard/components/AdminCreateUserModal.tsx` | Extrair modal de criação p/ componente separado |
| `src/pages/dashboard/components/AdminVagaPermissionModal.tsx` | Extrair modal de permissão de vagas |
| `src/pages/dashboard/components/AdminUserTable.tsx` | Extrair tabela de usuários com lógica de org grouping |
| `src/common/constants/roleDefinitions.ts` | Mover `roleDefinitions` p/ local compartilhado |

### Arquivos SEM alteração

- `src/App.tsx` — rotas permanecem (`/admin` e `/configuracoes`)
- `src/pages/auth/Login.tsx` — redirect de reset password (`/configuracoes`) permanece
- `src/common/components/ui/DatePicker.tsx`
- `src/pages/dashboard/AdminLogs.tsx`
- `src/core/services/logger.ts`
- `src/core/contexts/UserContext.tsx`
- `src/core/contexts/ThemeContext.tsx`

---

## 5. Mapeamento de Código a Migrar

### 5.1 Estado e Handlers que saem de `Configuracoes.tsx` e vão p/ `AdminDashboard.tsx`

| Item | Origem (linha) | Destino |
|------|----------------|---------|
| `allUsers` state | 252 | AdminDashboard |
| `showCreateModal` state | 253 | AdminDashboard |
| `newUser` state | 254-258 | AdminDashboard |
| `creatingUser` state | 259 | AdminDashboard |
| `vagaModalUserId` state | 260 | AdminDashboard |
| `vagasList` state | 261-263 | AdminDashboard |
| `userVagaIds` state | 264 | AdminDashboard |
| `vagaLoading` state | 265 | AdminDashboard |
| `loadUsers()` | 458-468 | AdminDashboard (integrar com fetchDashboardData ou separado) |
| `loadUsersRef` | 297 | AdminDashboard |
| `loadVagas()` | 470-473 | AdminDashboard |
| `loadUserVagaAccess()` | 475-480 | AdminDashboard |
| `handleCreateUser()` | 495-575 | AdminDashboard |
| `handleUpdateUserRole()` | 578-598 | AdminDashboard (corrigir bug) |
| `handleToggleOrgStatus()` | 603-621 | AdminDashboard |
| `handleResendInvite()` | 623-639 | AdminDashboard |
| `handleToggleVagaAccess()` | 482-492 | AdminDashboard |
| `roleDefinitions` constant | 155-212 | Shared constant (ou inline) |
| `showToast` helper | 224-228 | AdminDashboard (ou usar toast direto) |
| `useEffect` p/ carregar users | 299-309 | AdminDashboard |
| Modal de criar usuário | 1694-1839 | AdminDashboard |
| Modal de permissão de vagas | 1841-1938 | AdminDashboard |
| Tabela de usuários (Owner view) | 1382-1562 | AdminDashboard (seção separada) |
| Tabela de usuários (Gestor view) | 1566-1673 | AdminDashboard |

### 5.2 O que fica em `Configuracoes.tsx`

- Abas: **Perfil**, **Segurança**, **Aparência**, **API**, **Plano**
- Toda a lógica de perfil (nome, email, foto, endereço, telefone)
- Toda a lógica de segurança (trocar senha)
- Toda a lógica de aparência (tema claro/escuro, bg theme, cores customizadas)
- Toda a lógica de API (Evolution config)
- Toda a lógica de Plano
- Componentes `OwnerAdminApiPanel` e `OwnerAdminPlanPanel`
- `isMobile` detection (já existe, mantém)
- `getVisibleTabs` — remover `'perfis'` das abas base
- `TabKey` type — remover `'perfis'`

---

## 6. Design da Solução

### 6.1 Estrutura do AdminDashboard após migração

```
┌─────────────────────────────────────────┐
│  Painel Administrador (header)          │
│  [Filtro por Organização] (owner only)  │
├─────────────────────────────────────────┤
│  Stats Cards (total, ativos, inativos)  │
├─────────────────────────────────────────┤
│  Charts + Calendar (período)            │
├─────────────────────────────────────────┤
│  Filter Bar + [Convidar Usuário] btn    │
├─────────────────────────────────────────┤
│  User Management Section                │
│  ┌─ Owner view ─────────────────────┐   │
│  │ Organizações agrupadas + gestor  │   │
│  │ Membros, Status, SUSPENDER/      │   │
│  │ REATIVAR, REENVIAR               │   │
│  └──────────────────────────────────┘   │
│  ┌─ Gestor view ───────────────────┐   │
│  │ Membros (RH/Convidado), Status, │   │
│  │ Ativar/Desativar, Vagas, EDITAR │   │
│  │ PERFIL, REENVIAR                │   │
│  └──────────────────────────────────┘   │
│  ┌─ RH/Convidado view ────────────┐   │
│  │ "Acesso Restrito"              │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 6.2 Visão do Owner

- Tabela com **organizações agrupadas** (igual ao Perfis atual)
- Colunas: Organização/Empresa, Gestor Principal, Membros, Status, Ações
- Ações: SUSPENDER/REATIVAR (org toda), REENVIAR convite (gestores pendentes)
- **Novo**: botão "Convidar Gestor" no header + modal de criação
- Abaixo: manter a tabela plana de **todos os usuários**? Ou substituir pela visão agrupada?

**Decisão de design**: Substituir a tabela plana atual pela visão agrupada (mais útil p/ Owner). A visão plana com filtro por org já é atendida pelo agrupamento.

### 6.3 Visão do Gestor

- Tabela de membros (RH + Convidado), igual ao Perfis atual
- Colunas: Usuário, Cargo, Status, Ações
- Ações: Ativar/Desativar, Gerenciar Vagas (só convidado), Reenviar Convite
- **Novo**: botão "Convidar Membro" no header + modal de criação

### 6.4 Visão do RH / Convidado

- Mensagem "Acesso Restrito" (igual ao Perfis atual)
- Ou: esconder completamente a seção de usuários para quem não tem permissão

---

## 7. Integração com o Código Existente do AdminDashboard

### 7.1 Já existe em AdminDashboard

- `users` state + `setUsers`
- `organizations` state + `setOrganizations`
- `selectedOrgId` filter
- `roleFilter` + `statusFilter` + `search`
- `filteredUsers` computado
- `toggleStatus()` — ativar/desativar usuário individual
- `updatingId` state
- `isMobile` detection
- Stats cards + charts

### 7.2 Conflito: `fetchDashboardData` vs `loadUsers`

AdminDashboard busca `profiles` dentro de `fetchDashboardData` (que também busca jobs p/ gráfico). Configuracoes tem `loadUsers` separado.

**Decisão**: Unificar as queries. Como `fetchDashboardData` já busca todos os profiles (respeitando isolamento), podemos eliminar `loadUsers` e usar o `users` state do AdminDashboard também para a seção de gerenciamento. Mas precisa recarregar após criar/alterar usuário.

**Risco**: `fetchDashboardData` tem `isInitial` guard e não mostra loading em refetch. Após criar usuário, precisamos forçar refresh.

### 7.3 Bug conhecido no `handleUpdateUserRole` (linha 1636)

No Perfis atual, o botão "Desativar"/"Ativar" do Gestor chama:
```tsx
onClick={() => handleUpdateUserRole(user.id, user.status === 'active' ? 'inactive' : 'active')}
```

Isso altera `user_role` do usuário para `'active'`/`'inactive'` em vez de alterar `status`. **Corrigir na migração**: usar `toggleStatus` (que já existe em AdminDashboard) ou criar handler específico.

---

## 8. Pontos Cegos e Riscos (Revisão Profunda)

### 8.1 `labelStyle`, `inputStyle`, `fieldWrapStyle`, `iconFieldStyle` — estilos do modal

Os objetos de estilo usados no modal de criação de usuário (`labelStyle`, `inputStyle`, `fieldWrapStyle`, `iconFieldStyle`) estão definidos em Configuracoes.tsx e NÃO existem em AdminDashboard.

```tsx
const inputStyle = { width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '11px 14px 11px 42px', color: 'var(--text-main)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, background 0.2s' };
const labelStyle = { display: 'block', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '6px' };
const fieldWrapStyle = { position: 'relative' };
const iconFieldStyle = { position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-dim)', pointerEvents: 'none' };
```

**Solução**: Copiar os 4 objetos para AdminDashboard, ou refatorar o modal para usar CSS classes.

### 8.2 `roleDefinitions` usado em 2 lugares distintos

A constante `roleDefinitions` (linhas 155-212) é usada:
- Na aba **Perfis** (Owner view, Gestor view, modal de criação) — **migra para AdminDashboard**
- Na aba **Perfil** (linhas 758, 781) — **permanece em Configuracoes**

**Solução**: Extrair `roleDefinitions` para `src/common/constants/roleDefinitions.ts`. Ambos os arquivos importam de lá.

### 8.3 `allUsers` e `loadUsers` precisam PERMANECER em Configuracoes

`OwnerAdminApiPanel` (linha 1946) e `OwnerAdminPlanPanel` (linha 2070) em Configuracoes recebem `allUsers` como prop. Após remover a aba Perfis:
- **Owner**: o `useEffect` (linhas 299-309) ainda triggera `loadUsers` quando `activeTab === 'api'` ou `activeTab === 'plano'` ✅
- **Gestor**: não vê API/Plano, então `loadUsers` nunca mais é chamado (OK, gestor não precisa mais de `allUsers` em Configuracoes) ✅

**Solução**: Manter `loadUsers` + `allUsers` + `loadUsersRef` + o `useEffect` (modificado para remover `'perfis'`) em Configuracoes.

### 8.4 `UserProfile` não tem `organization_name` — mas é usado na tabela

`UserProfile` (AdminDashboard, linhas 56-64) NÃO inclui `organization_name`, mas a tabela o exibe via type cast (`(user as { organization_name?: string }).organization_name` — linha 647).

`AdminUser` (OwnerPanels, linhas 8-20) já inclui `organization_name`.

**Solução**: Adicionar `organization_name?: string` a `UserProfile`.

### 8.5 Bug confirmado: `handleUpdateUserRole` altera `user_role` com valor de `status`

**Linha 1636**: `handleUpdateUserRole(user.id, user.status === 'active' ? 'inactive' : 'active')` passa `'active'`/`'inactive'` como `newRole`, mas a função (linha 581) faz `.update({ user_role: newRole })`.

Isso CORROMPE o campo `user_role` do usuário, setando-o para `'active'` ou `'inactive'`.

**Solução**: **NÃO migrar** `handleUpdateUserRole`. Em vez disso, usar `toggleStatus` do AdminDashboard (linhas 242-254), que já atualiza o campo `status` corretamente.

### 8.6 `showToast` não existe em AdminDashboard

Os handlers que migram (`handleCreateUser`, `handleToggleOrgStatus`, `handleResendInvite`, `handleToggleVagaAccess`) usam `showToast`. AdminDashboard não tem essa função.

Apenas `'success'` e `'error'` são usados nos handlers que migram (o único `'info'` fica na aba Aparência, que permanece em Configuracoes).

**Solução**: Adicionar `showToast` simplificado em AdminDashboard ou usar `toast.success()`/`toast.error()` diretamente.

### 8.7 `logActivity` não importado em AdminDashboard

`handleCreateUser` chama `logActivity(profile.userId, 'Criou novo usuário', ...)`.

AdminDashboard não importa `logActivity`. O `profile` em AdminDashboard inclui `userId` (vem do `useUser()`).

**Solução**: Adicionar `import { logActivity } from '../../core/services/logger'` em AdminDashboard.

### 8.8 `canCreate` e lógica de hierarquia

A função `canCreate` (linhas 501-504) e a filtragem de roles no modal (linhas 1773-1809) precisam ser copiadas para AdminDashboard.

Regras:
- **Owner** → pode criar apenas `gestor`
- **Gestor** → pode criar apenas `rh` e `convidado`
- **RH/Convidado** → não podem criar ninguém

**Solução**: Copiar `canCreate` e a lógica de filtro de roles para AdminDashboard.

### 8.9 Visão do Owner: tabela plana vs agrupamento por org

AdminDashboard hoje mostra **tabela plana** de usuários. Perfis mostra **visão agrupada por organização** para Owner (cada linha é uma org, com gestor, membros, status da org).

**Decisão de design**: Substituir a tabela plana pela visão agrupada quando `userRole === 'owner'`. Para Gestor, manter a tabela de membros com ações estendidas (Desativar/Ativar, Vagas, Reenviar).

**Impacto**: A tabela plana atual do AdminDashboard é usada para calcular stats. Os stats (total, ativos, inativos) já usam `displayUsersForStats` que considera `selectedOrgId` — a visão agrupada não quebra isso.

### 8.10 `handleToggleOrgStatus` — toggle de org inteira

Precisa ser copiado para AdminDashboard. Toggle ALL users em uma org via `eq('organization_id', orgId)`. Usa `showToast`.

### 8.11 `handleResendInvite` — reenvio de convite

Precisa ser copiado para AdminDashboard. Invoca edge function `send-invite-email`. Usa `showToast`.

### 8.12 `handleToggleVagaAccess` + `loadVagas` + `loadUserVagaAccess`

Precisa ser copiado para AdminDashboard. Gerencia permissão de vagas para usuários `convidado`.

### 8.13 `newUser.organization_name` é campo morto

O state `newUser.organization_name` nunca é usado na criação (a org é derivada de `profile.organization_name`). Pode ser omitido.

### 8.14 `loadUsersRef` — padrão de ref desnecessário

Usar ref para evitar dependência no effect é uma escolha de implementação. Pode ser simplificado com `useCallback`, mas não é blocker.

### 8.15 Sidebar e navegação permanecem

A rota `/configuracoes` continua existindo (Perfil, Segurança, Aparência, API, Plano). Navegação no dropdown do usuário e rotas em App.tsx **não mudam**.

### 8.16 Testes obrigatórios

Após cada fase, rodar:
- `npx tsc --noEmit` — zero erros
- `npx eslint` em arquivos modificados — zero warnings
- `npx vite build` — build ok

---

## 9. Plano de Implementação (Ordem Sugerida)

### Fase 0: Preparação
- [ ] Extrair `roleDefinitions` para `src/common/constants/roleDefinitions.ts`
- [ ] Atualizar imports em Configuracoes.tsx
- [ ] Verificar se `AdminUser` pode substituir `UserProfile` ou se precisamos de type alias

### Fase 1: AdminDashboard — Adicionar funcionalidades
- [ ] Adicionar estados: `showCreateModal`, `newUser`, `creatingUser`, `vagaModalUserId`, etc.
- [ ] Adicionar handlers: `handleCreateUser`, `handleResendInvite`, `handleToggleOrgStatus`, `handleToggleVagaAccess`
- [ ] Importar `logActivity`, `toast`
- [ ] Adicionar botão "Convidar Usuário" no header da seção de filtro
- [ ] Adaptar a tabela de usuários:
  - [ ] Owner: visão agrupada por organização
  - [ ] Gestor: visão de membros com ações (Desativar/Ativar, Vagas, Reenviar)
  - [ ] Corrigir bug do `handleUpdateUserRole` → usar `toggleStatus`
- [ ] Adicionar Modal de Criação de Usuário
- [ ] Adicionar Modal de Permissão de Vagas

### Fase 2: Configuracoes — Remover aba Perfis
- [ ] Remover `'perfis'` de `allTabs`
- [ ] Remover `'perfis'` de `TabKey`
- [ ] Remover `'perfis'` de `getVisibleTabs` base tabs
- [ ] Remover o bloco `{activeTab === 'perfis' && ( ... )}`
- [ ] Remover estados de Perfis (`allUsers`, `showCreateModal`, etc.)
- [ ] Remover handlers de Perfis (`loadUsers`, `handleCreateUser`, etc.)
- [ ] Remover imports não usados (ícones específicos de Perfis)
- [ ] Manter `loadUsers` + `allUsers` se API/Plano ainda precisam

### Fase 3: Limpeza e Verificação
- [ ] Rodar `tsc --noEmit` (sem erros)
- [ ] Rodar `eslint` (sem warnings)
- [ ] Rodar `vite build` (build ok)
- [ ] Testar fluxos manualmente:
  - Owner: criar gestor, suspender org, reativar org, reenviar convite
  - Gestor: criar RH, criar convidado, gerenciar vagas do convidado, ativar/desativar
  - RH/Convidado: ver "Acesso Restrito"
  - Configuracoes: abas Perfil, Segurança, Aparência, API, Plano intactas

---

## 10. Estrutura de Arquivos Final

```
src/
  common/
    constants/
      roleDefinitions.ts          ← NOVO (extraído de Configuracoes)
  pages/
    dashboard/
      AdminDashboard.tsx           ← MODIFICADO (+ modais, + handlers, + visões)
      components/                  ← OPCIONAL (extrair modais)
        AdminCreateUserModal.tsx
        AdminVagaPermissionModal.tsx
        AdminUserTable.tsx
    settings/
      Configuracoes.tsx            ← MODIFICADO (remover aba Perfis)
      OwnerPanels.tsx              ← SEM ALTERAÇÃO (já exporta AdminUser)
  layouts/
    Sidebar.tsx                    ← SEM ALTERAÇÃO
```

---

## 11. Não Fazer

- Não alterar `DashboardLayout.tsx` ou `Sidebar.tsx` (navegação permanece)
- Não alterar rotas em `App.tsx`
- Não alterar `AdminLogs.tsx`
- Não alterar `OwnerPanels.tsx` (a não ser que necessário p/ AdminUser)
- Não alterar lógica de autenticação ou RLS
- Não adicionar novas dependências npm
- Não criar media queries CSS — usar `isMobile` state padronizado
- Não refatorar stats/charts/calendar do AdminDashboard (só adicionar seção de usuários)
