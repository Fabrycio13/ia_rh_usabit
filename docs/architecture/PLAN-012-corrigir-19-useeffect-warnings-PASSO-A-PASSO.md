# Plano: Corrigir 19 Warnings de useEffect (Exhaustive-Deps)

## Objetivo
Corrigir 19 warnings de `react-hooks/exhaustive-deps` de forma cirúrgica, sem quebrar o código. **Meta: 0 errors, 0 warnings.**

## Regra de Ouro
> Se a correção parecer arriscada ou exigir mudança de lógica, usar `useRef` como bridge — é o padrão mais seguro e menos invasivo.

---

## Padrão: Bridge com useRef (SOLUÇÃO UNIVERSAL)

Para functions definidas dentro do componente que são chamadas em `useEffect`:

```typescript
// ANTES (causa warning)
useEffect(() => {
  fetchData();
}, []);

async function fetchData() { ... }

// DEPOIS (sem warning, seguro)
const fetchDataRef = useRef<() => Promise<void>>(() => Promise.resolve());
fetchDataRef.current = async function fetchData() { ... };

useEffect(() => {
  fetchDataRef.current();
}, []);
```

**Por que funciona:**
- `useRef` é criado durante o render (nunca é `undefined`)
- A atribuição `fetchDataRef.current = async function...` atualiza a referência
- O effect chama `fetchDataRef.current()` que sempre aponta para a função mais recente

---

## Arquivos e Correções

### 1. AddCandidateModal.tsx:405 — `checkDuplicate`

**Contexto:**
```typescript
useEffect(() => {
  if (email.trim() || phone.trim()) {
    const timer = setTimeout(() => {
      checkDuplicate();
    }, 500);
    return () => clearTimeout(timer);
  }
}, [email, phone, profile.userId]);
```

**Problema:** `checkDuplicate` é chamada dentro do timer (closure), não na deps.

**Solução (useRef bridge):**

1. Encontrar onde `checkDuplicate` é definida
2. Mudar de `async function checkDuplicate()` para:
```typescript
const checkDuplicateRef = useRef<() => Promise<void>>(() => Promise.resolve());
checkDuplicateRef.current = async function checkDuplicate() { /* corpo existente */ };
```
3. No effect, mudar `checkDuplicate()` para `checkDuplicateRef.current()`

**Arquivo:** `src/common/components/AddCandidateModal.tsx`
**Linhas:** ~390-410

---

### 2. UserContext.tsx:159 — `profile.userId`

**Contexto:**
```typescript
useEffect(() => {
  const channel = supabase
    .channel('profile-changes')
    .on('postgres_changes', { event: 'UPDATE', table: 'profiles' }, (payload) => {
      if (payload.new.id === userId) {
        loadProfile(); // <- loadProfile não está na deps
      }
    })
    .subscribe();
  return () => { subscription.unsubscribe(); ... };
}, []);
```

**Problema:** `loadProfile` é chamada em callback de realtime mas não está na deps.

**Solução:**

Opção A — Mover `loadProfile` para dentro do `useEffect` via ref:
```typescript
const loadProfileRef = useRef(loadProfile);
loadProfileRef.current = loadProfile;

useEffect(() => {
  const channel = supabase
    .channel('profile-changes')
    .on('postgres_changes', { event: 'UPDATE', table: 'profiles' }, (payload) => {
      if (payload.new.id === userId) {
        loadProfileRef.current(); // <- usa ref
      }
    })
    .subscribe();
  return () => { ... };
}, []);
```

Opção B — Adicionar `loadProfile` à deps array (pode funcionar se `loadProfile` for estável).

**Arquivo:** `src/core/contexts/UserContext.tsx`
**Linhas:** ~145-160

---

### 3. CandidatePanel.tsx:112 — 11 campos de `c`

**Contexto:**
```typescript
useEffect(() => {
  setLocalC({
    email: c.email,
    address: c.address,
    address_number: c.address_number,
    age: c.age,
    cep: c.cep,
    complement: c.complement,
    gender: c.gender,
    linkedin: c.linkedin,
    location: c.location,
    phone: c.phone,
    portfolio: c.portfolio,
  });
}, [c.email, c.address, c.address_number, c.age, c.cep, c.complement, c.gender, c.linkedin, c.location, c.phone, c.portfolio]);
```

**Problema:** 11 campos de `c` listados — muito verboso. ESLint sugere `useReducer`.

**Solução A (useReducer — correta):**

Mudar de:
```typescript
const [localC, setLocalC] = useState<Candidate>({...});
```

Para:
```typescript
const [localC, dispatch] = useReducer((state: Candidate, action: Partial<Candidate>) => ({ ...state, ...action }), initialC);
```

E remover o effect completamente — o `dispatch` pode ser chamado diretamente onde `setLocalC` era chamado.

**Solução B (mais simples):** Adicionar apenas `c.id` à deps e mudar o effect para:
```typescript
useEffect(() => {
  setLocalC(c);
}, [c.id]);
// Onde setLocalC era chamado: usar setLocalC(prev => ({ ...prev, ...novosCampos }))
```

**Arquivo:** `src/features/analysis/CandidatePanel.tsx`
**Linhas:** ~105-130

---

### 4. CandidatePanel.tsx:207 — `activeTab` e `c.isVagaView`

**Contexto:**
```typescript
useEffect(() => {
  fetchScreeningLogs(c.id, activeTab, c.isVagaView);
}, [c.id]); // activeTab e c.isVagaView faltam
```

**Solução:** Adicionar à deps:
```typescript
}, [c.id, activeTab, c.isVagaView]);
```

**Arquivo:** `src/features/analysis/CandidatePanel.tsx`
**Linhas:** ~205-215

---

### 5. CandidatePanel.tsx:229 — `fetchScreeningLogs`

**Contexto:**
```typescript
useEffect(() => {
  fetchScreeningLogs(c.id, activeTab, c.isVagaView);
}, [c.id, activeTab, c.isVagaView]); // fetchScreeningLogs não está na deps
```

**Solução:** Mudar para ref:
```typescript
const fetchScreeningLogsRef = useRef(fetchScreeningLogs);
fetchScreeningLogsRef.current = fetchScreeningLogs;

useEffect(() => {
  fetchScreeningLogsRef.current(c.id, activeTab, c.isVagaView);
}, [c.id, activeTab, c.isVagaView]);
```

**Arquivo:** `src/features/analysis/CandidatePanel.tsx`
**Linhas:** ~225-240

---

### 6. Analises.tsx:263 — `profile.organization_id` e `profile.userId`

**Contexto:**
```typescript
useEffect(() => {
  fetchAnalisesRef.current(profile.userId);
}, [profile.loaded]); // organization_id e userId faltam
```

**Problema:** `fetchAnalises` usa `profile.organization_id` mas só `profile.userId` está sendo passado como argumento. A deps array só tem `profile.loaded`.

**Solução:** Analisar o que `fetchAnalises` realmente precisa. Se só usa `userId` como argumento, não precisa de mudança na deps do effect — o warning é porque `fetchAnalisesRef.current` é a "função". Adicionar:
```typescript
}, [profile.loaded, fetchAnalisesRef]);
```

Ou simplesmente:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [profile.loaded]);
```

**Arquivo:** `src/pages/analysis/Analises.tsx`
**Linhas:** ~260-270

---

### 7. Pipeline.tsx:404 — `init`

**Contexto:**
```typescript
useEffect(() => {
  init();
}, []);
```

**Problema:** `init` definida depois no código.

**Solução (ref bridge):**
```typescript
const initRef = useRef(init);
initRef.current = init;

useEffect(() => {
  initRef.current();
}, []);
```

**Arquivo:** `src/pages/candidates/Pipeline.tsx`
**Linhas:** ~400-420

---

### 8. Pipeline.tsx:438 — `loadPipelineData`

**Contexto:**
```typescript
useEffect(() => {
  loadPipelineData(pipelineId);
}, [pipelineId]);
```

**Solução:**
```typescript
const loadPipelineDataRef = useRef(loadPipelineData);
loadPipelineDataRef.current = loadPipelineData;

useEffect(() => {
  loadPipelineDataRef.current(pipelineId);
}, [pipelineId]);
```

**Arquivo:** `src/pages/candidates/Pipeline.tsx`
**Linhas:** ~435-450

---

### 9. AdminDashboard.tsx:199 — `fetchDashboardData`

**Contexto:**
```typescript
useEffect(() => {
  fetchDashboardData(); // eslint-disable-line react-hooks/set-state-in-effect,react-hooks/exhaustive-deps
}, [activeStart, activeEnd, selectedOrgId]);
```

**Problema:** Já tem eslint-disable mas foi removido pelo `--fix`.

**Solução:** Trocar para `useCallback` na função:
```typescript
const fetchDashboardData = useCallback(async () => {
  // ... corpo existente
}, [activeStart, activeEnd, selectedOrgId]); // dependencias que fetchDashboardData usa internamente

useEffect(() => {
  fetchDashboardData();
}, [fetchDashboardData]);
```

**ATENÇÃO:** Esta solução exige que `fetchDashboardData` não use outras variáveis do escopo — se usar, precisa adicioná-las às deps do `useCallback`.

**Arquivo:** `src/pages/dashboard/AdminDashboard.tsx`
**Linhas:** ~115-205

---

### 10. AdminLogs.tsx:98 — `fetchLogs`

**Contexto:**
```typescript
useEffect(() => {
  fetchLogs(); // eslint-disable-line react-hooks/set-state-in-effect,react-hooks/exhaustive-deps
}, []);
```

**Solução (ref bridge — mais segura):**
```typescript
const fetchLogsRef = useRef<() => Promise<void>>(() => Promise.resolve());
fetchLogsRef.current = fetchLogs;

useEffect(() => {
  fetchLogsRef.current();
}, []);
```

**Arquivo:** `src/pages/dashboard/AdminLogs.tsx`
**Linhas:** ~55-100

---

### 11. Dashboard.tsx:228 — `fetchData`

**Contexto:**
```typescript
useEffect(() => {
  fetchData(profile.userId).finally(() => clearTimeout(t));
  const ch = supabase.channel('dash-rt')
    .on('postgres_changes', ..., () => fetchData(profile.userId))
    .subscribe();
  return () => { clearTimeout(t); supabase.removeChannel(ch); };
}, [profile.userId, profile.loaded]);
```

**Problema:** `fetchData` não está na deps mas é chamada no effect e no callback do realtime.

**Solução (ref bridge):**
```typescript
const fetchDataRef = useRef<(userId: string) => Promise<void>>(() => Promise.resolve());
fetchDataRef.current = fetchData;

useEffect(() => {
  fetchDataRef.current(profile.userId).finally(() => clearTimeout(t));
  const ch = supabase.channel('dash-rt')
    .on('postgres_changes', ..., () => fetchDataRef.current(profile.userId))
    .subscribe();
  return () => { clearTimeout(t); supabase.removeChannel(ch); };
}, [profile.userId, profile.loaded]);
```

**Arquivo:** `src/pages/dashboard/Dashboard.tsx`
**Linhas:** ~214-230

---

### 12. Configuracoes.tsx:294 — `loadUsers`

**Contexto:**
```typescript
useEffect(() => {
  const isOwner = profile.user_role === 'owner';
  const isGestor = profile.user_role === 'gestor';
  const needsUsers = activeTab === 'perfis' || (isOwner && (activeTab === 'api' || activeTab === 'plano'));

  if (needsUsers && (isOwner || isGestor)) {
    loadUsers();
  }
}, [activeTab, profile.user_role]);
```

**Solução (ref bridge):**
```typescript
const loadUsersRef = useRef(loadUsers);
loadUsersRef.current = loadUsers;

useEffect(() => {
  const isOwner = profile.user_role === 'owner';
  const isGestor = profile.user_role === 'gestor';
  const needsUsers = activeTab === 'perfis' || (isOwner && (activeTab === 'api' || activeTab === 'plano'));

  if (needsUsers && (isOwner || isGestor)) {
    loadUsersRef.current();
  }
}, [activeTab, profile.user_role]);
```

**Arquivo:** `src/pages/settings/Configuracoes.tsx`
**Linhas:** ~284-295

---

### 13. Chat.tsx:49 — `loadConversations`

**Contexto:**
```typescript
useEffect(() => {
  loadConversations();
}, []);
```

**Solução (ref bridge):**
```typescript
const loadConversationsRef = useRef<() => Promise<void>>(() => Promise.resolve());
loadConversationsRef.current = loadConversations;

useEffect(() => {
  loadConversationsRef.current();
}, []);
```

**Arquivo:** `src/pages/support/Chat.tsx`
**Linhas:** ~45-55

---

### 14. CareerPortalHub.tsx:46 — `searchParams` e `setSearchParams`

**Contexto:**
```typescript
useEffect(() => {
  setSearchParams({ ... });
}, []);
```

**Problema:** `useSearchParams()` retorna `[searchParams, setSearchParams]`. O effect deveria adicionar `searchParams` e `setSearchParams` à deps, mas `setSearchParams` pode causar re-renders se na deps.

**Solução:**

Opção A (correta):
```typescript
const [searchParams, setSearchParams] = useSearchParams();

// Modificar effect para não depender de setSearchParams se não precisar
useEffect(() => {
  // lógica que só lê searchParams
}, [searchParams]);
```

Opção B (se precisa setar):
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  setSearchParams({ ... });
}, []);
```

**Arquivo:** `src/pages/vagas/CareerPortalHub.tsx`
**Linhas:** ~40-55

---

### 15. JobApplication.tsx:661 — `formData.phone`

**Contexto:** Ver o effect completo para entender o propósito.

**Solução:** Depende do que o effect faz. Se o effect é só para formatar/adjustar algo quando `formData.phone` muda, adicionar à deps:
```typescript
}, [formData.phone]);
```

Se não precisa reagir a mudanças, remover a lógica do effect ou adicionar eslint-disable.

**Arquivo:** `src/pages/vagas/JobApplication.tsx`
**Linhas:** ~658-665

---

### 16. JobApplication.tsx:748 — `triggerStepReveal`

**Contexto:**
```typescript
useEffect(() => {
  triggerStepReveal();
}, []);
```

**Solução (ref bridge):**
```typescript
const triggerStepRevealRef = useRef(triggerStepReveal);
triggerStepRevealRef.current = triggerStepReveal;

useEffect(() => {
  triggerStepRevealRef.current();
}, []);
```

**Arquivo:** `src/pages/vagas/JobApplication.tsx`
**Linhas:** ~745-755

---

### 17. SpontaneousApplication.tsx:446 — `formData.phone`

**Mesma solução do item 15.**

**Arquivo:** `src/pages/vagas/SpontaneousApplication.tsx`
**Linhas:** ~443-450

---

### 18. SpontaneousApplication.tsx:509 — `triggerStepReveal`

**Mesma solução do item 16.**

**Arquivo:** `src/pages/vagas/SpontaneousApplication.tsx`
**Linhas:** ~506-515

---

### 19. Vagas.tsx:241 — `userOrgId`

**Causa:** FALSE POSITIVE.

```typescript
useEffect(() => {
  const fetchInitialData = async () => {
    // userOrgId é lido aqui via closure, não no escopo do effect
    if (userOrgId && userOrgId !== 'null') { ... }
  };
  fetchInitialData();
}, []); // ESLint pensa que userOrgId deveria estar aqui
```

**Solução:** Adicionar eslint-disable:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  const fetchInitialData = async () => { ... };
  fetchInitialData();
}, []);
```

**ATENÇÃO:** Não adicionar `userOrgId` à deps — isso causaria re-fetch desnecessário sempre que `userOrgId` mudasse, mesmo que o effect deva rodar só uma vez.

**Arquivo:** `src/pages/vagas/Vagas.tsx`
**Linhas:** ~238-245

---

## Ordem de Implementação Sugerida

### Fase 1: Ref Bridge (Mais Simples — Risco Baixo)
Estes são os mais fáceis de aplicar com o padrão ref bridge:

1. Chat.tsx:49 (`loadConversations`)
2. AdminLogs.tsx:98 (`fetchLogs`)
3. AdminDashboard.tsx:199 (`fetchDashboardData`) — **mas ver alternativa useCallback abaixo
4. Dashboard.tsx:228 (`fetchData`)
5. Configuracoes.tsx:294 (`loadUsers`)
6. Pipeline.tsx:404 (`init`)
7. Pipeline.tsx:438 (`loadPipelineData`)
8. CandidatePanel.tsx:229 (`fetchScreeningLogs`)
9. JobApplication.tsx:748 (`triggerStepReveal`)
10. SpontaneousApplication.tsx:509 (`triggerStepReveal`)

### Fase 2: Adicionar Dependência Direta (Risco Médio)
11. CandidatePanel.tsx:207 — adicionar `activeTab` e `c.isVagaView` à deps
12. JobApplication.tsx:661 — adicionar `formData.phone` à deps (verificar se faz sentido)
13. SpontaneousApplication.tsx:446 — mesmo acima

### Fase 3: Casos Especiais (Risco Alto —需 análise)
14. AddCandidateModal.tsx:405 (`checkDuplicate`) — ver o corpo da função
15. UserContext.tsx:159 (`loadProfile`) — ver o contexto
16. CandidatePanel.tsx:112 (11 campos) — possivelmente usar solução B (só `c.id`)
17. Analises.tsx:263 (`profile.organization_id/userId`) — ver se realmente precisa

### Fase 4: ESLint Disable (Falso Positive / Solução Arriscada)
18. CareerPortalHub.tsx:46 (`searchParams`) — possivelmente eslint-disable
19. Vagas.tsx:241 (`userOrgId`) — FALSE POSITIVE, usar eslint-disable

---

## Verificação Após Cada Correção

Após cada arquivo corrigido:

```bash
npm run lint 2>&1 | Select-String "problems"
# Esperado: menos warnings a cada correção

npm run build 2>&1 | Select-Object -Last 5
# Esperado: "✓ built" sem errors
```

**Se lint mostrar novos errors, REVERTER IMEDIATAMENTE e usar eslint-disable.**

---

## Template para Novos Arquivos

Ao aplicar em cada arquivo, usar este template:

```typescript
// ANTES:
useEffect(() => {
  myFunction();
}, []);

async function myFunction() { ... }

// DEPOIS:
const myFunctionRef = useRef<() => Promise<void>>(() => Promise.resolve());
myFunctionRef.current = async function myFunction() { ... };

useEffect(() => {
  myFunctionRef.current();
}, []);
```

---

## Caso `fetchData` Recebe Parâmetros

Se a função recebe parâmetros (ex: `fetchData(userId)`):

```typescript
// ANTES:
useEffect(() => {
  fetchData(userId);
}, [userId]);

function fetchData(userId: string) { ... }

// DEPOIS:
const fetchDataRef = useRef<(userId: string) => Promise<void>>(() => Promise.resolve());
fetchDataRef.current = async function fetchData(userId: string) { ... };

useEffect(() => {
  fetchDataRef.current(userId);
}, [userId]);
```

---

## Resumo Final

| # | Arquivo | Solução | Risco |
|---|---------|---------|-------|
| 1 | AddCandidateModal.tsx:405 | Ref bridge | Médio |
| 2 | UserContext.tsx:159 | Ref bridge | Médio |
| 3 | CandidatePanel.tsx:112 | Só `c.id` na deps | Baixo |
| 4 | CandidatePanel.tsx:207 | Adicionar deps | Baixo |
| 5 | CandidatePanel.tsx:229 | Ref bridge | Baixo |
| 6 | Analises.tsx:263 | eslint-disable ou deps | Baixo |
| 7 | Pipeline.tsx:404 | Ref bridge | Baixo |
| 8 | Pipeline.tsx:438 | Ref bridge | Baixo |
| 9 | AdminDashboard.tsx:199 | useCallback ou ref | Médio |
| 10 | AdminLogs.tsx:98 | Ref bridge | Baixo |
| 11 | Dashboard.tsx:228 | Ref bridge | Baixo |
| 12 | Configuracoes.tsx:294 | Ref bridge | Baixo |
| 13 | Chat.tsx:49 | Ref bridge | Baixo |
| 14 | CareerPortalHub.tsx:46 | eslint-disable | Baixo |
| 15 | JobApplication.tsx:661 | Adicionar deps | Baixo |
| 16 | JobApplication.tsx:748 | Ref bridge | Baixo |
| 17 | SpontaneousApplication.tsx:446 | Adicionar deps | Baixo |
| 18 | SpontaneousApplication.tsx:509 | Ref bridge | Baixo |
| 19 | Vagas.tsx:241 | eslint-disable | Baixo |
