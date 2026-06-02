# Tasks: Modal de Confirmação antes de Analisar Candidato do Pool

## T1: Adicionar Estados de Confirmação ✅

**Arquivo:** `src/pages/vagas/PoolTalentos.tsx`

**Descrição:** Adicionar dois novos estados após a linha `const [vagaSearch, setVagaSearch] = useState('');`:
- `const [showConfirm, setShowConfirm] = useState(false);`
- `const [confirmCandidate, setConfirmCandidate] = useState<Candidate | null>(null);`

**Verificação:** `npx tsc -b`

---

## T2: Modificar openAnalyzeModal → openConfirmModal ✅

**Arquivo:** `src/pages/vagas/PoolTalentos.tsx`

**Descrição:** Renomear a função `openAnalyzeModal` para `openConfirmModal`. No lugar de chamar `fetchVagas()` diretamente, apenas setar `confirmCandidate` e `showConfirm`. Criar uma `openAnalyzeModal` separada contendo a lógica original (`fetchVagas`, resets) para ser chamada pelo botão "Sim, analisar".

**Detalhes:**
- `openConfirmModal(candidate)`: seta `confirmCandidate`, `showConfirm: true`
- `openAnalyzeModal()`: seta `analyzingCandidate: confirmCandidate`, reseta `selectedVagaId`, `vagaSearch`, chama `fetchVagas()`, seta `showConfirm: false`

**Verificação:** `npx tsc -b`

---

## T3: Renderizar Modal de Confirmação ✅

**Arquivo:** `src/pages/vagas/PoolTalentos.tsx`

**Descrição:** Inserir o JSX do modal de confirmação entre o modal de seleção de vaga (`analyzingCandidate`) e o `PoolAddCandidate`. O modal deve conter:

- Overlay com backdrop blur (mesmo padrão do modal de vaga)
- Card centralizado:
  - Título: "Confirmar análise"
  - Corpo: "Deseja analisar **{confirmCandidate.name}** para uma vaga? Isso vai consumir uma análise via IA e remover o candidato do Pool de Talentos."
  - Botão "Cancelar": `closeConfirmModal()`
  - Botão "Sim, analisar": `handleConfirm()`

**Estilo dos botões:**
- "Cancelar": ghost/outline (mesmo estilo do cancelar do modal de vaga)
- "Sim, analisar": primary solid (mesmo estilo do "Analisar" do modal de vaga)
- `justifyContent: 'flex-end'` nos botões (consistente com o modal de vaga)

**Verificação:** `npx tsc -b`

---

## T4: Funções closeConfirmModal e handleConfirm ✅

**Arquivo:** `src/pages/vagas/PoolTalentos.tsx`

**Descrição:**
- `closeConfirmModal()`: seta `showConfirm: false`, `confirmCandidate: null`
- `handleConfirm()`: verifica se `confirmCandidate` existe, seta `analyzingCandidate = confirmCandidate`, `showConfirm = false`, reseta `selectedVagaId`, `vagaSearch`, chama `fetchVagas()`

**Verificação:** `npx eslint .`

---

## T5: Atualizar Referências do Botão "Analisar" ✅

**Arquivo:** `src/pages/vagas/PoolTalentos.tsx`

**Descrição:** No `onClick` do botão de análise (ícone Target) na linha ~580, trocar `openAnalyzeModal(candidato)` por `openConfirmModal(candidato)`. Também atualizar a chamada em `onAnalyzeWithVagas` (linha ~656) no CandidatePanel.

**Verificação:** `npx tsc -b`

---

## T6: Limpeza de Estado no closeAnalyzeModal ✅

**Arquivo:** `src/pages/vagas/PoolTalentos.tsx`

**Descrição:** Garantir que `closeAnalyzeModal` também reseta `showConfirm` e `confirmCandidate` (defensive cleanup, caso o modal de confirmação ainda esteja aberto quando o modal de vaga for fechado por algum motivo).

**Verificação:** `npx eslint .`

---

## T7: Validação Final ✅

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
T1 ── Estados showConfirm + confirmCandidate
 │
 ├──→ T2 ── Renomear openAnalyzeModal → openConfirmModal
 │
 ├──→ T3 ── JSX modal de confirmação
 │
 ├──→ T4 ── closeConfirmModal + handleConfirm
 │
 ├──→ T5 ── Atualizar referências do botão
 │
 ├──→ T6 ── Limpeza no closeAnalyzeModal
 │
 └──→ T7 ── Validação Final
```

T3 e T4 podem ser feitos em conjunto. T1 é pré-requisito para T2. T2 é pré-requisito para T3 e T4.
