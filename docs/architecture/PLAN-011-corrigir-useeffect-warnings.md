# Plano: Corrigir Warnings de useEffect

## Resumo

Corrigir 30 warnings de lint ESLint (`react-hooks/exhaustive-deps`) de forma cirúrgica, sem quebrar lógica existente. 5 são auto-fixáveis, 25 precisam de análise.

---

## Diagnóstico dos 30 Warnings

### Auto-fixáveis com `eslint --fix` (5):

| # | Arquivo | Linha | Tipo |
|---|---------|-------|------|
| 1 | Configuracoes.tsx | 664 | eslint-disable unused directive |
| 2 | Configuracoes.tsx | 667 | eslint-disable unused directive |
| 3 | Configuracoes.tsx | 684 | eslint-disable unused directive |
| 4 | Configuracoes.tsx | 687 | eslint-disable unused directive |
| 5 | Configuracoes.tsx | 689 | eslint-disable unused directive |

### useEffect Missing Dependencies (25):

| # | Arquivo | Linha | Dependência(s) faltando | Abordagem |
|---|---------|-------|--------------------------|-----------|
| 1 | AddCandidateModal.tsx | 405 | `checkDuplicate` | Encapsular em `useCallback` |
| 2 | UserContext.tsx | 159 | `profile.userId` | Adicionar à deps array |
| 3 | CandidatePanel.tsx | 112 | `c.address`, `c.address_number`, etc (11 campos) | Considerar `useReducer` em vez de `useState` + effect |
| 4 | CandidatePanel.tsx | 207 | `activeTab`, `c.isVagaView` | Adicionar à deps array |
| 5 | CandidatePanel.tsx | 229 | `fetchScreeningLogs` | Encapsular em `useCallback` |
| 6 | TalentTransferModal.tsx | 131 | `candidate.email` | Adicionar à deps array |
| 7 | Chat.tsx | 741 | `files.length` em useCallback | Remover da deps array |
| 8 | Chat.tsx | 263 | `profile.organization_id`, `profile.userId` | Adicionar à deps array |
| 9 | Chat.tsx | 655 | `fetchAnalises` | Encapsular em `useCallback` |
| 10 | Dashboard.tsx | 89 | `scrollY` | Adicionar à deps array |
| 11 | Dashboard.tsx | 172 | `fetchCandidates` | Encapsular em `useCallback` |
| 12 | Dashboard.tsx | 404 | `init` | Encapsular em `useCallback` |
| 13 | Dashboard.tsx | 438 | `loadPipelineData` | Encapsular em `useCallback` |
| 14 | Dashboard.tsx | 200 | `fetchDashboardData` | Encapsular em `useCallback` |
| 15 | Dashboard.tsx | 98 | `fetchLogs` | Encapsular em `useCallback` |
| 16 | Dashboard.tsx | 227 | `fetchData` | Encapsular em `useCallback` |
| 17 | Dashboard.tsx | 293 | `loadUsers` | Encapsular em `useCallback` |
| 18 | Dashboard.tsx | 49 | `loadConversations` | Encapsular em `useCallback` |
| 19 | AnaliseNova.tsx | 46 | `searchParams`, `setSearchParams` | Refatorar para `useSearchParams` hook |
| 20 | Pipeline.tsx | 474 | `containerRef` | Adicionar à deps array |
| 21 | SpontaneousApplication.tsx | 446 | `formData.phone` | Verificar lógica — pode não precisar |
| 22 | SpontaneousApplication.tsx | 509 | `triggerStepReveal` | Encapsular em `useCallback` |
| 23 | SpontaneousApplication.tsx | 661 | `formData.phone` | Verificar lógica |
| 24 | SpontaneousApplication.tsx | 748 | `triggerStepReveal` | Encapsular em `useCallback` |
| 25 | Vagas.tsx | 240 | `userOrgId` | **NÃO CORRIGIR** — effect não deve re-agir a userOrgId mudanças |

---

## Tarefas

### Tarefa 1: Auto-fix 5 eslint-disable inválidos

**Arquivo:** `src/pages/settings/Configuracoes.tsx`

```bash
npm run lint -- --fix
```

Isso remove as 5 linhas de `// eslint-disable-next-line react-hooks/set-state-in-effect` que não estão sendo usadas.

---

### Tarefa 2: Analisar e corrigir CandidatePanel.tsx (useReducer)

**Arquivo:** `src/features/analysis/CandidatePanel.tsx`

**Linhas 112, 207, 229:**

O warning da linha 112 é o mais complexo — lista 11 campos de `c` como dependências. A mensagem do ESLint sugere usar `useReducer` em vez de `useState` + effect que lê `c.email`.

**Antes de mexer**, verificar se `setLocalC` é chamado em outros lugares. Se não for, pode ser simplificado para não depender de `c` no effect.

**Abordagem:**
1. Ler as linhas 100-130 para entender o effect
2. Se `setLocalC` só é chamado nesse effect → mudar para `useReducer`
3. Linhas 207 e 229: encapsular `fetchScreeningLogs` em `useCallback` se necessário

---

### Tarefa 3: Funções callback para effects que usam funções

**Padrão recurring:** Many effects call functions like `fetchAnalises`, `fetchCandidates`, `fetchLogs`, etc. que são definidas no mesmo componente e nunca mudam.

**Solução padrão:**
```typescript
// Ao invés de:
useEffect(() => { fetchData(); }, []);

// Fazer:
const fetchDataRef = useRef(fetchData);
fetchDataRef.current = fetchData;

useEffect(() => { fetchDataRef.current(); }, []);
```

Ou melhor, usar `useCallback` para encapsular a função E adicionar ao deps array.

**Arquivos afetados:**
- `Chat.tsx` (lines 655)
- `Dashboard.tsx` (lines 98, 172, 200, 227, 293, 404, 438)
- `SpontaneousApplication.tsx` (line 509, 748)
- `AddCandidateModal.tsx` (line 405)
- `TalentTransferModal.tsx` (line 131)
- `CandidatePanel.tsx` (line 229)

---

### Tarefa 4: Adicionar dependências simples

**Padrão:** Some effects legitimately need values that aren't in the deps array.

**Arquivos afetados:**
- `UserContext.tsx` (line 159): adicionar `profile.userId` à deps array
- `CandidatePanel.tsx` (line 207): adicionar `activeTab` e `c.isVagaView`
- `TalentTransferModal.tsx` (line 131): adicionar `candidate.email`
- `Chat.tsx` (line 263): adicionar `profile.organization_id` e `profile.userId`
- `Dashboard.tsx` (line 89): adicionar `scrollY`
- `Pipeline.tsx` (line 474): adicionar `containerRef`
- `SpontaneousApplication.tsx` (lines 446, 661): analisar se `formData.phone` realmente precisa ser dependência

---

### Tarefa 5: Remover dependências desnecessárias

**Padrão:** Some deps in useCallback are unnecessary (like `files.length`).

**Arquivo:**
- `Chat.tsx` (line 741): `useCallback` com `files.length` — remover da deps array do useCallback

---

### Tarefa 6: NÃO CORRIGIR — Vagas.tsx line 240

**Arquivo:** `src/pages/vagas/Vagas.tsx` line 240

O effect com `userOrgId` como dependência pode causar loops infinitos ou re-renders desnecessários. Este warning deve ser **IGNORADO** (não é seguro corrigir sem analisar profundamente).

---

### Tarefa 7: Build + Lint + Teste

Após cada tarefa, rodar:
```bash
npm run build && npm run lint
```

Se build ou lint falhar, reverter IMMEDIATAMENTE.

---

## Ordem de Execução

1. Tarefa 1: `eslint --fix` (auto-fix, rápido, sem risco)
2. Tarefa 5: Remover deps desnecessárias (Chat.tsx line 741) — simples
3. Tarefa 4: Adicionar dependências simples — arquivo por arquivo
4. Tarefa 3: Callback wrapping — mais delicado
5. Tarefa 2: CandidatePanel useReducer — complexo, fazer por último
6. Tarefa 6: Verificar Vagas.tsx — deixar como último recurso

---

## Regra de Ouro

> **Se o warning for complexo demais ou a correção parecer arriscada**, adicionar `// eslint-disable-next-line react-hooks/exhaustive-deps` com comentário explicativo ao invés de forçar uma correção que pode quebrar o código.

---

## Validação Final

1. `npm run build` — sem erros
2. `npm run lint` — 0 errors, número de warnings reduzido
3. Testar manualmente os fluxos dos arquivos modificados
4. `git diff` antes de commit — verificar apenas changes esperados
