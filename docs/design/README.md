# Design System — Usabit people

> **Design system oficial do projeto.** Todos os agentes de design consultam esta pasta como fonte da verdade.
>
> Esta pasta é **idêntica** às referências em `opencode.json → instructions` — todo agente carrega estes arquivos automaticamente.

## Estrutura

| Arquivo | O que define |
|---|---|
| `identidade_visual.md` | Cores (dark/light), tipografia, sombras, gradientes |
| `componentes_e_padroes.md` | Estrutura de pastas, componentes base (Button, Card, Input) |
| `spacing.md` | Escala 4px (Tailwind padrão) |
| `layout.md` | Breakpoints, grid, responsividade |
| `forbidden-patterns.md` | "❌ NÃO faça" + checklist do critic |
| `tema_frequencia.md` | Padrão visual do tema frequência |
| `guidelines.csv` | 100 regras UX (No, Category, Issue, Do, Don't) |
| `auditoria-cores-hardcoded.md` | Inventário de cores hardcoded (122 únicas / 1400 ocorrências) |

## Quem consulta

| Agente | Quando |
|---|---|
| `@design-planner` | Antes de propor redesign — consulta todos |
| `@designer` | Para criar tokens/componentes |
| `@frontend` | Para alinhamento com design system |
| `@static-critic` | Para validar patterns proibidos |

## Auto-loading

Os 7 primeiros arquivos são carregados automaticamente em toda sessão via `opencode.json → instructions`. Não precisa fazer nada além de existir aqui.

## Histórico

- 2026-07-14: criada (movida de `docs/manuais/` para identificar o propósito). Pasta `docs/manuais/` continua existindo com arquivos não-relacionados a design.
