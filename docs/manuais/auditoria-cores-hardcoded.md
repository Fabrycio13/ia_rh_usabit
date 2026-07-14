# Auditoria de Cores Hardcoded — IA RH

> **Data:** 2026-07-14
> **Total de cores únicas:** 122
> **Total de ocorrências:** 1400
> **40 tokens CSS já existem** em `src/index.css` (ver `docs/manuais/identidade_visual.md`)

## Top 50 cores mais usadas

| # | Cor | Ocorrências |
|---|-----|-------------|
|   1 | `#fff` | 184 |
|   2 | `#ef4444` | 143 |
|   3 | `#22c55e` | 80 |
|   4 | `#10b981` | 75 |
|   5 | `#6366f1` | 74 |
|   6 | `#64748b` | 63 |
|   7 | `#f59e0b` | 62 |
|   8 | `#ffffff` | 52 |
|   9 | `#3b82f6` | 49 |
|  10 | `#2c58fd` | 42 |
|  11 | `#94a3b8` | 37 |
|  12 | `#04070c` | 31 |
|  13 | `#f1f5f9` | 24 |
|  14 | `#8b5cf6` | 18 |
|  15 | `#475569` | 17 |
|  16 | `#8e929e` | 17 |
|  17 | `#c3c7cd` | 17 |
|  18 | `#0b111a` | 15 |
|  19 | `#a855f7` | 15 |
|  20 | `#ec4899` | 13 |
|  21 | `#2563eb` | 13 |
|  22 | `#1a3597` | 12 |
|  23 | `#2d2f36` | 12 |
|  24 | `#f5f6f8` | 11 |
|  25 | `#14b8a6` | 10 |
|  26 | `#334155` | 10 |
|  27 | `#a78bfa` | 9 |
|  28 | `#4f46e5` | 9 |
|  29 | `#121316` | 9 |
|  30 | `#1c1d22` | 9 |
|  31 | `#cbd5e1` | 9 |
|  32 | `#60a5fa` | 8 |
|  33 | `#fbbf24` | 8 |
|  34 | `#0ea5e9` | 8 |
|  35 | `#16a34a` | 7 |
|  36 | `#0b1020` | 7 |
|  37 | `#06b6d4` | 7 |
|  38 | `#d97706` | 7 |
|  39 | `#ff0000` | 7 |
|  40 | `#060d08` | 6 |
|  41 | `#dc2626` | 5 |
|  42 | `#e2e8f0` | 5 |
|  43 | `#000000` | 5 |
|  44 | `#6b6e79` | 5 |
|  45 | `#0f172a` | 5 |
|  46 | `#1d4ed8` | 5 |
|  47 | `#0274b3` | 5 |
|  48 | `#1877f2` | 5 |
|  49 | `#25d366` | 5 |
|  50 | `#111827` | 5 |

## Tokens CSS existentes

Para referência, os tokens definidos em `src/index.css` incluem:

- `--bg-main`, `--bg-card`, `--bg-sidebar`, `--bg-input`
- `--primary`, `--primary-hover`, `--secondary`
- `--text-main`, `--text-muted`, `--text-dim`, `--text-error`
- `--border`, `--success`, `--warning`
- E ~30 outros tokens

## Mapeamento sugerido (automático, revisar caso a caso)

| Cor hardcoded | Token sugerido |
|---------------|----------------|
| `#0d0f17` | `var(--bg-input)` (usado em 1 ocorrências) |
| `#0f111a` | `var(--bg-main)` (usado em 2 ocorrências) |
| `#10b981` | `var(--success)` (usado em 75 ocorrências) |
| `#12141d` | `var(--bg-sidebar)` (usado em 1 ocorrências) |
| `#1a1d27` | `var(--bg-card)` (usado em 3 ocorrências) |
| `#22c55e` | `var(--success)` (variante) (usado em 80 ocorrências) |
| `#2563eb` | `var(--primary-hover)` (usado em 13 ocorrências) |
| `#3b82f6` | `var(--primary)` (usado em 49 ocorrências) |
| `#64748b` | `var(--text-dim)` (usado em 63 ocorrências) |
| `#8b5cf6` | `var(--secondary)` (usado em 18 ocorrências) |
| `#94a3b8` | `var(--text-muted)` (usado em 37 ocorrências) |
| `#ef4444` | `var(--text-error)` (usado em 143 ocorrências) |
| `#fff` | `var(--text-main)` (usado em 184 ocorrências) |
| `#ffffff` | `var(--text-main)` (usado em 52 ocorrências) |

## Top 15 arquivos com mais cores hardcoded

| Arquivo | Cores hardcoded |
|---------|-----------------|
| `src\pages\vagas\JobApplication.tsx` | 108 |
| `src\pages\vagas\SpontaneousApplication.tsx` | 101 |
| `src\pages\marketing\LandingPage.tsx` | 100 |
| `src\pages\dashboard\Dashboard.tsx` | 82 |
| `src\pages\vagas\VagaForm.tsx` | 79 |
| `src\pages\dashboard\AdminDashboard.tsx` | 67 |
| `src\pages\candidates\Pipeline.tsx` | 64 |
| `src\pages\vagas\PoolTalentos.tsx` | 64 |
| `src\index.css` | 57 |
| `src\features\analysis\CandidatePanel.tsx` | 46 |
| `src\pages\vagas\Vagas.tsx` | 45 |
| `src\pages\candidates\CandidateBank.tsx` | 35 |
| `src\pages\settings\Configuracoes.tsx` | 32 |
| `src\pages\vagas\VagaCandidatos.tsx` | 31 |
| `src\pages\support\Ajuda.tsx` | 27 |

## Como refatorar

```tsx
// Antes (hardcoded)
<div className="bg-[#0f111a] text-[#fff]">

// Depois (com token — funciona com Tailwind)
<div className="bg-bg-main text-text-main">  // se houver @theme inline

// Ou direto com CSS variable
<div className="bg-[var(--bg-main)] text-[var(--text-main)]">
```

**Nota:** Como o projeto usa Tailwind v4 com `@theme inline`, as classes `bg-bg-main`, `text-text-main` devem funcionar. Caso contrário, usar `var(--bg-main)` diretamente.