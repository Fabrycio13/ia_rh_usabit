---
name: audit-hardcoded-colors
description: "Auditoria dinâmica de cores hardcoded (#hex, rgb, hsl) nos arquivos .ts/.tsx/.css do projeto. Retorna cores únicas, contagens e sugestão de token equivalente. Use quando o @design-planner quiser auditar cores dinamicamente em vez de usar `auditoria-cores-hardcoded.md` (que está congelado)."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [design, colors, audit, tokens, refactor]
    related_skills: [audit-project, manage-migrations]
---

# Audit Hardcoded Colors — IA RH

Skill que faz varredura dinâmica de cores hardcoded nos arquivos `.ts/.tsx/.css` do projeto, sem depender do arquivo `auditoria-cores-hardcoded.md` (que está congelado desde 2026-07-14).

## Quando Usar

- @design-planner quer auditar uma tela específica antes de propor redesign
- @static-critic precisa validar conformidade de tokens em um PR
- Usuário pergunta "quantas cores hardcoded tem em src/pages/auth/?"
- Antes de fazer refactor visual em massa

## Como Executar (3 opções)

### Opção 1 — Terminal direto (recomendado, mais rápido)

```bash
# Cores HEX únicas em todo o src/
rg -o "#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}\b" src/ --type ts --type tsx --type css \
  | sort | uniq -c | sort -rn | head -30

# Cores HEX em um diretório específico
rg -o "#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}\b" src/pages/auth/ \
  | sort | uniq -c | sort -rn

# Top cores no arquivo único
rg -o "#[0-9a-fA-F]{3,6}\b" src/pages/dashboard/Dashboard.tsx | sort | uniq -c
```

### Opção 2 — Usar ferramentas do OpenCode

Você tem `tools: [read, grep, glob, skill, task]` — pode usar `grep` para mesma coisa:

```
→ grep(#[0-9a-fA-F]{3,6}, src/pages/)
   retorna lista de matches
```

### Opção 3 — Hard-coded lookup de token

Use `docs/design/identidade_visual.md` (já carregado como instruction) pra mapear:

| Cor hardcoded | Token correspondente |
|---|---|
| `#0f111a` | `var(--bg-main)` |
| `#1a1d27` / `#1a1c27` | `var(--bg-card)` |
| `#3b82f6` | `var(--primary)` |
| `#2563eb` | `var(--primary-hover)` |
| `#8b5cf6` | `var(--secondary)` |
| `#ffffff` / `#fff` | `var(--text-main)` |
| `#94a3b8` | `var(--text-muted)` |
| `#64748b` | `var(--text-dim)` |
| `#ef4444` | `var(--text-error)` |
| `#10b981` / `#22c55e` | `var(--success)` |
| `#1f2332` | `var(--border)` |
| `#0d0f17` | `var(--bg-input)` |

## Output Esperado

Quando rodar a skill, gere este relatório:

```markdown
## Auditoria de Cores — src/pages/auth/
- Arquivos varridos: 5
- Cores únicas: 12
- Ocorrências totais: 47

| Cor | Ocorrências | Token sugerido |
|---|---|---|
| `#3b82f6` | 18 | `var(--primary)` |
| `#fff` | 12 | `var(--text-main)` |
| `#94a3b8` | 8 | `var(--text-muted)` |
| `outras` | 9 | revisar |
```

## Limitações

- ❌ Não conta cores em SVG via Gradiente (usaria outra regex)
- ❌ Não distingue `var(--primary)` (token) de `#primary` (incorreto)
- ❌ Não conta rgba/hsla com mesma cor em formatos diferentes
- ✅ Cobre o caso mais comum (hex no meio de strings Tailwind)

## Quando NÃO usar

- Para validar conformidade de TODOS os tokens do projeto → use `docs/design/auditoria-cores-hardcoded.md` (snapshot estático)
- Para mudar o design system → delegue pro `@design-planner`
