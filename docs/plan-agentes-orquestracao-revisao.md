# Plano: Agentes OpenCode para Orquestração e Revisão

## Contexto
Criação de dois agentes opencode para o projeto IA RH (Usabit people):
- **Orquestrador** (primary) — coordena planejamento, implementação e revisão
- **Revisor** (subagent) — análise de código read-only em 6 categorias

## Pré-requisitos descobertos durante planejamento

Antes dos agentes, o projeto precisava de:

1. **Constituição** (`.specify/memory/constitution.md`) — 5 princípios não-negociáveis
2. **AGENTS.md enriquecido** — stack, comandos, arquitetura (fora do bloco SPECKIT)
3. **opencode.json com `instructions`** — carregar manuais automaticamente

## Arquivos Criados

| Arquivo | Função |
|---------|--------|
| `.specify/memory/constitution.md` | 5 princípios (Segurança, CSS, TypeScript, RLS, Qualidade) |
| `AGENTS.md` | Diretrizes do projeto (bloco SPECKIT preservado) |
| `opencode.json` | Adicionado `instructions` + `default_agent: orquestrador` |
| `.opencode/agents/revisor.md` | Subagent read-only, 6 categorias de análise |
| `.opencode/agents/orquestrador.md` | Primary agent, fluxo padrão + delegação ao revisor |

## Como Usar

### Revisor
```
@revisor revisa esse diff
@revisor analisa o arquivo src/pages/vagas/PoolTalentos.tsx
@revisor verifica se essa migration de SQL está segura
```

### Orquestrador
Cicle com Tab até selecionar o orquestrador, ou use como default.
O orquestrador segue o fluxo: contexto → plano → revisão pré → implementação → revisão pós → verificação.

### Alternar entre agentes
- **Tab** — cicla entre agentes primários (build, plan, orquestrador)
- **@revisor** — invoca o subagent em qualquer conversa

## Referências
- Constituição: `.specify/memory/constitution.md`
- Manuais: `docs/manuais/componentes_e_padroes.md`
- Manual visual: `docs/manuais/identidade_visual.md`
- Segurança: `docs/security/SECURITY_BACKLOG.md`
- Especificações ativas: `specs/`
