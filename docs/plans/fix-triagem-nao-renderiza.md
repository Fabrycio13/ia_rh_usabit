# Fix: Triagem não renderiza no CandidatePanel

**Branch:** `fix/remediation-sprint` | **Data:** 2026-05-28

## Diagnóstico

**Arquivo:** `src/features/analysis/CandidatePanel.tsx`

**Causa raiz:** O commit `8667e06` (PR #79) "corrigiu" as dependências do `useEffect` de auto-switch na linha 207, adicionando `activeTab` ao array de dependências. Isso criou um loop:

1. Usuário clica em "Triagem" → `setActiveTab('triagem')`
2. `useEffect` re-executa porque `activeTab` mudou
3. Condição `activeTab === 'triagem' && c.applications?.length` é verdadeira
4. `setActiveTab('vagas')` é chamado → volta forçado para Vagas
5. Usuário vê apenas um flicker (ou nada) — Triagem "não renderiza"

## Mudanças Realizadas

### 1. Auto-switch com controle único via `useRef` (linhas 203-207)

A lógica de auto-switch agora usa um `useRef` (`hasAutoSwitched`) para garantir que a sincronização para a aba "Vagas" ocorra **apenas uma vez** na montagem inicial, quando `c.applications` é populado. O `activeTab` foi removido das dependências para não re-triggerar o efeito quando o usuário interage com as abas.

### 2. Fetch de screening logs inline no `useEffect` (linhas 227-230)

A função solta `fetchScreeningLogs` foi removida. A lógica de busca foi movida para dentro do `useEffect` com um flag `cancelled` para prevenir setState em componente desmontado. Isso elimina o `// eslint-disable-next-line react-hooks/exhaustive-deps`.

## Verificação

- `npx eslint . --max-warnings 0` → 0 erros, 0 warnings
- `tsc -b && vite build` → build bem-sucedido
