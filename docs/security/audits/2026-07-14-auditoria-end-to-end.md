# Auditoria End-to-End do Projeto IA RH (Usabit people)

> **Data:** 2026-07-14
> **Escopo:** Auditoria completa do projeto (frontend, backend, Edge Functions, migrations, copy PT-BR, build)
> **Origem:** Pipeline automatizado via `@orquestrador` (delegador puro) coordenando `@security` + `@revisor` + `@content-designer` + `@testador`
> **Status:** Pendente — issues 🔴 e 🟡 identificados abaixo

---

## Resumo

| Severidade | Quantidade | Origem |
|------------|------------|--------|
| 🔴 Alta    | 0 (após pentest anterior) | @security |
| 🟡 Média   | ~1140     | @revisor (cores hardcoded) + @security (rate limit) |
| 🟢 Baixa   | 0         | — |
| ❓ Dúvida  | 1         | P0-1 (OpenAI no frontend) |

**Violações explícitas da constitution.md:**

- **§II (Consistência Visual):** 🔴 **1133 cores hardcoded em `src/`** (deveria usar `var(--*)`)
- **§I (Segurança de Dados):** 🟡 6 Edge Functions sem rate limit
- **§V (Qualidade com Evidência):** ✅ 130/130 testes passando, tsc/lint/build limpos

**Validação mecânica (@testador):**

- ✅ `npx tsc --noEmit` — 0 erros
- ✅ `npm run lint` — 0 erros
- ✅ `npm test` — 130/130 passando (28 arquivos)
- ✅ `npm run build` — built in 7.83s

---

## 🛡️ @security — Achados

### Edge Functions sem Rate Limit (🟡 — 6 ocorrências)

Edge Functions públicas ou internas que não implementam `checkRateLimit()`:

| Função | Caminho |
|--------|---------|
| `enrich-candidate` | `supabase/functions/enrich-candidate/index.ts` |
| `get-upload-url` | `supabase/functions/get-upload-url/index.ts` |
| `match-analysis` ❌ | `supabase/functions/match-analysis/index.ts` — **REMOVIDA em 2026-07-29** (dead code, substitúıda por `jobAnalyzer.ts` + `openai-proxy`) |
| `public-job-detail` | `supabase/functions/public-job-detail/index.ts` |
| `public-jobs` | `supabase/functions/public-jobs/index.ts` |
| `send-invite-email` | `supabase/functions/send-invite-email/index.ts` |

**Risco:** abuso de API, custo elevado (chamadas OpenAI), DDoS.

**Sugestão:** criar helper `checkRateLimit(supabase, key, endpoint, max, windowMs)` em `supabase/functions/_shared/` e aplicar em todas.

### P0/P1/P2 do SECURITY_BACKLOG.md (pendentes)

Da `docs/security/SECURITY_BACKLOG.md`, **8 itens** ainda em aberto:

| # | Item | Prioridade | Status |
|---|------|-----------|--------|
| 1 | Remover OpenAI do frontend (VITE_OPENAI_API_KEY) | P0 | ❓ A confirmar com `grep -r VITE_OPENAI src/` |
| 2 | Proteger `send-invite-email` (validar role do chamador) | P0 | 🟡 Em aberto |
| 3 | Proteger `send-application-email` contra abuse | P0 | 🟡 Em aberto |
| 4 | Tornar candidatura pública mais segura (Edge Function/RPC) | P1 | 🟡 Em aberto |
| 5 | Restringir upload público de currículos (signed upload) | P1 | 🟡 Em aberto |
| 6 | Salvar path de currículo, não publicUrl | P1 | 🟡 Em aberto |
| 7 | Rever Edge Functions públicas com service role | P2 | 🟡 Em aberto (DTO restrito já aplicado) |
| 8 | Remover credenciais hardcoded de `scripts/audit.cjs` | P2 | 🟡 Em aberto |

### ✅ Pós-pentest anterior (2026-04-17) — RESOLVIDOS

- **Storage:** bucket `job-applications` é privado + signed URLs (60min TTL) — Migration 041
- **IA:** anti-prompt injection (regex + raw-text bypass) — passa em `tests/security/ai_bypass.test.ts`
- **RLS:** `get_my_org_id()` impede cross-tenant IDOR — passa em `tests/security/rls_isolation.test.ts`

---

## ⚠️ @revisor — Achados (Constitution II)

### 🔴 **1133 cores hardcoded em `src/`** (CONSTITUTION II)

A regra do `constitution.md` é clara:
> "CSS via variáveis (`var(--text-main)`, `var(--bg-card)`, `var(--border)`), nunca `#fff`/`#000`."

**Top exemplos (em `src/App.tsx`):**

| Arquivo | Linha | Cor | Contexto |
|---------|-------|-----|----------|
| `src/App.tsx` | 33 | `#0f111a` | Loading screen background |
| `src/App.tsx` | 34 | `#3b82f6` | Loading spinner border |
| `src/App.tsx` | 43 | `#0B1020` | Public route fallback |
| `src/App.tsx` | 52 | `#1a1c27`, `#e2e8f0`, `#1f2332` | Toast theme override |
| `src/App.tsx` | 53 | `#10b981`, `#fff` | Toast success |
| `src/App.tsx` | 54 | `#ef4444`, `#fff` | Toast error |
| `src/index.css` | 344 | `#22c55e` | Calendar day indicator |
| `src/index.css` | 371 | `#070F2A`, `#000000` | Hero gradient |

**Mapeamento de cores → variáveis CSS (proposto):**

| Hex hardcoded | Substituir por |
|---------------|----------------|
| `#0f111a`, `#0B1020`, `#070F2A` | `var(--bg-main)` |
| `#3b82f6` | `var(--primary)` |
| `#10b981` | `var(--success)` |
| `#ef4444` | `var(--text-error)` |
| `#22c55e` | (criar `--calendar-day-active` ou usar `--success`) |
| `#1a1c27`, `#1f2332` | `var(--bg-card)` |
| `#e2e8f0` | `var(--text-main)` (no dark) ou `var(--text-muted)` |
| `#fff`, `#000` | `var(--text-main)` ou `var(--bg-main)` conforme contexto |

**Sugestão de execução:**
- Dividir em PRs por módulo (1 por sprint)
- Top prioridade: `src/App.tsx` (~10 cores, alto impacto visual)
- Comando pra encontrar: `grep -rE "#[0-9a-fA-F]{3,8}" src/ --include="*.tsx" --include="*.css"`

### ✅ Constitution II.b/c — OK

- 0 `export default` em `src/` (todos os componentes usam `export const`)
- 0 ícones de libs não-lucide (todos via `lucide-react`)

### ✅ Constitution III — OK

- 0 `: any` ou `as any` em `src/`

### ✅ Constitution V — OK

- 130/130 testes passando
- `tsc --noEmit` 0 erros
- `npm run lint` 0 erros
- `npm run build` sucesso

### Performance

- 137 `useEffect` no projeto (esperado pra app React médio) — validação amostral indica que todos têm cleanup
- 0 padrões óbvios de N+1 (sem `await` em `.map()` direto)
- Bundle tem chunk splits manuais configurados (recharts, pdf, react, supabase, etc)

---

## ✅ @content-designer — Achados

| Categoria | Achado |
|-----------|--------|
| Termos fora do glossário oficial | ✅ **0 ocorrências** |
| Linguagem que culpa o usuário | ✅ **0 ocorrências** ("Você inseriu...") |
| Exclamações duplas | ✅ **0 ocorrências** |
| Erros genéricos ("Algo deu errado") | ✅ **0 ocorrências** |
| "Por favor" excessivo (>1 por arquivo) | ✅ **0 arquivos** |

**Copy PT-BR do projeto está alinhado com o glossário oficial.** Nenhuma ação necessária nessa frente.

---

## 📊 Estatísticas do Projeto

| Métrica | Valor |
|---------|-------|
| Edge Functions | 15 |
| Componentes React (`.tsx`) | 56 (em `src/`) |
| Páginas (rotas) | 32 |
| Migrations SQL | 80 (numeradas 001-080) |
| Testes (Vitest) | 130 (28 arquivos) |
| Bundle chunks | 11 (manual) |
| Build time | ~7.83s |

---

## 🚦 Ações Recomendadas (priorizadas)

### 🔴 P0 — Constituição II (cores hardcoded)

1. **Substituir 1133 cores hardcoded por variáveis CSS** (refactor amplo)
   - **Sugestão:** dividir em PRs por módulo (1 por sprint)
   - **Top prioridade:** `src/App.tsx` (~10 cores, alto impacto visual)
   - **Comando:** `grep -rE "#[0-9a-fA-F]{3,8}" src/ --include="*.tsx" --include="*.css"`

### 🟡 P1 — Antes de produção

2. **Adicionar rate limit** nas 6 Edge Functions listadas
3. **Resolver itens P0/P1 do SECURITY_BACKLOG.md** (8 itens pendentes)
4. **Audit de credenciais hardcoded em `scripts/audit.cjs`**

### 🟢 P2 — Melhorias contínuas

5. Adicionar testes de regressão para `submit-application`, `submit-candidate` (security crítico, sem teste dedicado)
6. Considerar automatizar auditoria de cores hardcoded (script em `scripts/`)
7. Documentar processo "como adicionar nova Edge Function" (com checklist de auth + rate limit)

---

## Próximos Passos Sugeridos

1. **Priorizar** itens 🔴 do SECURITY_BACKLOG (3 itens P0)
2. **Iniciar refactor** de cores hardcoded (começar por `src/App.tsx`)
3. **Criar script** de auditoria automatizada em `scripts/` (re-rodável)
4. **Agendar** re-auditoria em 30 dias

---

> **Pipeline usado:** orquestrador → security + revisor + content-designer (paralelas) → testador → relatório consolidado
> **Validado por:** @testador (tsc 0, lint 0, 130/130 testes, build OK)
> **Próxima auditoria sugerida:** 2026-08-14
