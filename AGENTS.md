# IA RH — Usabit people (AI-Powered Recruitment & Selection Platform)

## Stack
- Frontend: React 19 + TypeScript 5.9 (strict) + Vite 7 + Tailwind CSS v4
- Backend: Supabase (PostgreSQL, Auth, Storage, Edge Functions em Deno)
- UI: Shadcn/ui (Radix Nova) + Lucide icons + Recharts
- AI: OpenAI/Gemini via Edge Function proxy (openai-proxy)
- Testes: Vitest 4 + Testing Library + jsdom

## Comandos essenciais
| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Dev server (Vite) |
| `npm run build` | tsc -b && vite build |
| `npm run lint` | ESLint (NÃO roda no CI — executar manualmente) |
| `npm test` | Vitest (5 testes excluídos no CI — ver .github/workflows/main.yml) |
| `npx supabase functions deploy <nome>` | Deploy de Edge Function |

## Arquitetura
- `src/core/` — services (supabase, AI, logger, sanitizer), contexts (User, Theme, Lang, Analysis), config (permissions, aiPrompt)
- `src/common/components/` — UI reutilizável (Button, Card, Input, Modal)
- `src/common/components/ui/` — Primitivos base
- `src/features/` — Módulos por domínio (analysis, candidates)
- `src/pages/<dominio>/` — Páginas (auth, vagas, candidates, dashboard, settings, analysis, support, marketing)
- `supabase/functions/` — 12 Edge Functions (Deno)
- `supabase/migrations/` — Migrações SQL numeradas (001 a 068)
- `specs/` — Especificações ativas (Speckit workflow)
- `docs/` — Manuais, segurança, arquitetura, logs

## Hierarquia de Roles (RBAC)
```
Owner (5) > Administrador (4) > Supervisor (3) > RH (2) / Convidado (1)
```
- Permissões: `src/core/config/permissions.ts` (`hasPermission(role, feature)`)
- RLS: `get_my_role()` + `get_my_org_id()` + `IS NOT DISTINCT FROM`

## Padrões de Código
- Constituição: `.specify/memory/constitution.md` (5 princípios não-negociáveis)
- Manuais: `docs/manuais/componentes_e_padroes.md`, `docs/manuais/identidade_visual.md`
- CSS: sempre variáveis (`var(--text-main)`, `var(--bg-card)`, `var(--border)`)
- Componentes: `export const Nome = () => {}` (nunca `export default`)
- Supabase: chamadas diretas, sem camada de abstração
- AI chain: sanitizeInput → buildPrompt → callOpenAI → parseJSON → normalize

## Segurança
- Ver `docs/security/SECURITY_BACKLOG.md` para itens em aberto (P0-P2)
- Anti-XSS: DOMPurify (sanitizeHtml)
- Anti-prompt-injection: sanitizeAIInput (regex + NFKC normalize)
- RLS: toda tabela habilitada, `IS NOT DISTINCT FROM` para org_id
- Edge Functions: `checkRateLimit()`, `stripHtml()`, `sanitizeText()` em toda input

## Agentes OpenCode
- `@revisor` — subagent read-only para análise de código em 6 categorias (corretude, segurança, padrões, SQL/RLS, testes, performance)
- `@designer` — subagent especialista em design system e componentes UI (tokens CSS, lucide-react, export const)
- `@content-designer` — subagent UX writer (PT-BR) para escrever, revisar ou auditar copy de UI (botões, erros, estados vazios, placeholders, modais, tooltips). Glossário oficial do IA RH embutido. Use `/content-designer <tarefa>` ou `@content-designer <tarefa>`.
- `@frontend` — subagent engenheiro frontend sênior (React 19, TypeScript strict, perf, a11y WCAG 2.2, async/await, code splitting). Foco em produção, não prototipação.
- `@backend` — subagent engenheiro backend sênior (Supabase, PostgreSQL, RLS, Edge Functions Deno, Storage, LGPD). Migrations idempotentes, RLS em camadas, audit trail.
- `@security` — subagent engenheiro de segurança (pentest end-to-end, LGPD/GDPR, threat modeling, OWASP Top 10, MITRE ATT&CK). Read-only, reporta vulnerabilidades. Mentalidade Google/Amazon.
- `@testador` — subagent especialista em criar testes seguindo os padrões do projeto (Vitest + Testing Library + mocks). Único com bash: allow para rodar validações (tsc/lint/test/build).
- `@reproduce-bug` — subagent framework de reprodução de bugs (adaptado do n8n). Recebe contexto de ticket (Linear/GitHub/log), produz teste de regressão falhando + Reproduction Report. NÃO corrige o bug — só reproduz com evidência. Integra com `@orquestrador`: report acionável dispara delegação para `@frontend` ou `@backend`. Mesma skill também disponível no Hermes (`~/AppData/Local/hermes/skills/reproduce-bug/SKILL.md`) para reprodução interativa.
- `@orquestrador` — **delegador puro** (primary agent). NÃO implementa código. Decide qual subagent chamar e em que ordem, coordena o pipeline, compila UM relatório final agregado, pede autorização de commit. Pipeline: planejamento → @designer/@content-designer (paralelos) → @frontend/@backend (paralelos) → @revisor + @security → @testador → relatório final.

## Referências
- `.agent/` — Antigravity Kit (framework separado, NÃO integrado ao opencode)
- `.opencode/commands/speckit.*.md` — comandos do Speckit workflow
- `.opencode/plans/` — planos de implementação

## Regra de Commit (OBRIGATÓRIA — orquestrador)

1. **NUNCA** commitar sem permissão explícita do usuário ("comita", "commita aí", "faz push")
2. **SEMPRE** rodar antes de commitar:
   - `npx tsc --noEmit` (typecheck — 0 erros)
   - `npm run lint` (lint — 0 erros)
   - `npm test` (testes — todos passando)
   - Verificar warnings visuais/output
3. Se QUALQUER verificação falhar:
   - Corrigir o erro
   - Rodar novamente a verificação
   - Perguntar "Tudo limpo, pode comitar?" antes de prosseguir
4. Commit só após TODAS as verificações passarem
5. Push sempre junto com o commit

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.
Current plan: `specs/trial-version/plan.md`
Previous plan: `specs/trial-version/plan.md`
Previous plan: `specs/001-banco-talentos-pool/plan.md`

# Supabase CLI
- SUPABASE_ACCESS_TOKEN is stored as Windows user env var (set via `setx`)
- To deploy functions: `npx supabase functions deploy <function-name>`
- Project ref: dfsqdfetzcwvmfphljzs
- Edge functions are in `supabase/functions/`
<!-- SPECKIT END -->
