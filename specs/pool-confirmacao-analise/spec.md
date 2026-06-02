# Spec: Modal de Confirmação antes de Analisar Candidato do Pool

## Contexto

Atualmente, ao clicar no botão "Analisar para uma Vaga" (ícone de alvo) no Pool de Talentos, o modal de seleção de vaga abre diretamente. Não há uma etapa de confirmação que alerte o Gestor/RH sobre as consequências da ação: o candidato será removido do Pool de Talentos e uma análise via IA será consumida (gasto de crédito/API).

## Requisitos Funcionais

### FR-01: Modal de confirmação antes da seleção de vaga
Ao clicar no botão "Analisar para uma Vaga" no Pool de Talentos, exibir um modal de confirmação antes de abrir o modal de seleção de vaga, perguntando se o usuário realmente deseja analisar aquele candidato.

### FR-02: Mensagem clara sobre impactos
O modal de confirmação deve informar que:
- O candidato será removido do Pool de Talentos
- Uma análise via IA será consumida (crédito/API)

### FR-03: Dois botões de ação
O modal deve ter:
- "Cancelar" → fecha o modal, nada acontece
- "Sim, analisar" → avança para o modal de seleção de vaga (fluxo existente)

### FR-04: Proteção contra duplo clique
O botão "Sim, analisar" deve ser desabilitado após o clique enquanto o modal de seleção de vaga está abrindo.

### FR-05: Nenhuma alteração no fluxo pós-confirmação
Após clicar "Sim, analisar", o comportamento deve ser idêntico ao fluxo atual: abre o modal de seleção de vaga, e todo o fluxo de análise permanece inalterado.

### FR-06: Acessível apenas para Gestor e RH
Convidado não tem acesso ao Pool de Talentos (já bloqueado). A confirmação só é relevante para Gestor e RH.

## Perfis e Hierarquia

| Perfil | Ações |
|--------|-------|
| **Owner** | Vê confirmação, analisa candidatos |
| **Gestor** | Vê confirmação, analisa candidatos |
| **RH** | Vê confirmação, analisa candidatos |
| **Convidado** | Sem acesso ao Pool (já bloqueado) |

## Restrições Técnicas

- TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`)
- ESLint com regra `react-hooks/exhaustive-deps`
- PoolTalentos.tsx ~809 linhas — alterações mínimas e localizadas
- Reaproveitar os mesmos estilos e padrões do modal de seleção de vaga já existente
