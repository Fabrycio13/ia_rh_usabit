# Plano: Modal de Confirmação antes de Analisar Candidato do Pool

**Branch:** `fix/remediation-sprint`

## Arquitetura

```
┌───────────────────────────────────────────────┐
│            PoolTalentos.tsx (~809 linhas)       │
│                                                │
│  Ação atual: openAnalyzeModal → modal vaga    │
│  Ação nova: openConfirmModal → modal confirm  │
│             → "Sim" → openAnalyzeModal        │
└───────────────────────────────────────────────┘
```

## Fases de Implementação

### Fase 1: Estado + Modal de Confirmação
- Adicionar `showConfirm` state
- Modificar `openAnalyzeModal` → `openConfirmModal`
- Criar JSX do modal de confirmação
- Botão "Sim, analisar" fecha confirm e chama `openAnalyzeModal`

### Fase 2: Validação
- ESLint + TypeScript + Build

## Estados Adicionados

| Estado | Tipo | Descrição |
|--------|------|-----------|
| showConfirm | boolean | Controla visibilidade do modal de confirmação |
| confirmCandidate | Candidate \| null | Candidato selecionado para confirmar |

## Fluxo do Usuário

```
Pool de Talentos
  → Clica "Analisar para uma Vaga" (ícone alvo)
  → Abre modal de confirmação:
      "Deseja analisar [Nome] para uma vaga?"
      "Isso vai consumir uma análise via IA e remover o candidato do Pool de Talentos"
      [Cancelar] [Sim, analisar]
  → Clica "Sim, analisar"
  → Fecha modal de confirmação
  → Abre modal de seleção de vaga (fluxo existente)
  → Clica "Cancelar"
  → Fecha modal de confirmação, nada acontece
```
