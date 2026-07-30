# IA RH — Contexto Permanente

> Blocos nomeados por anchor (`CTX-nome-curto`) para referência cruzada. Sem histórico cronológico. Apenas fatos estáveis.

## CTX-project-constraints

### Produto

Plataforma interna de recrutamento e seleção (RH). Usada por owners, administradores, supervisores e recrutadores. Candidatos públicos se candidatam pelo portal.

### Stack confirmado

- Frontend: React 19 + TypeScript 5.9 (strict) + Vite 7 + Tailwind v4 (`package.json`)
- UI: Shadcn/ui (Radix Nova) + Lucide icons + Recharts
- Backend: Supabase (Postgres, Auth, Storage, Edge Functions em Deno)
- AI: OpenAI/Gemini via Edge Function `openai-proxy`
- Testes: Vitest 4 + Testing Library + jsdom

### RBAC

```
Owner (5) > Administrador (4) > Supervisor (3) > RH (2) / Convidado (1)
```

Permissões em `src/core/config/permissions.ts` (`hasPermission(role, feature)`).
RLS usa `get_my_role()` + `get_my_org_id()` + `IS NOT DISTINCT FROM`.

### Estrutura de pastas (verificada)

```text
src/core/           ← services, contexts, config
src/common/components/        ← UI reutilizável
src/features/       ← módulos por domínio (analysis, candidates)
src/pages/<dominio>/        ← auth, vagas, candidates, dashboard, settings, analysis, support, marketing
supabase/functions/          ← Edge Functions (Deno)
supabase/migrations/         ← Migrations SQL numeradas
specs/                       ← Especificações ativas (Speckit)
docs/                        ← Manuais, segurança, arquitetura
```

### Comandos essenciais

| Comando | Função |
|---------|--------|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` |
| `npm run lint` | ESLint (não roda no CI — manual) |
| `npm test` | Vitest (5 testes excluídos no CI — ver `.github/workflows/main.yml`) |
| `npx supabase functions deploy <name>` | Deploy de Edge Function |

### Padrões obrigatórios

- TypeScript strict; sem `any`, sem `// eslint-disable-next-line` suprimindo sem justificativa.
- Componentes exportados como `export const Nome = () => {}` (nunca `export default`).
- CSS sempre via variáveis (`var(--text-main)`, `var(--bg-card)`, `var(--border)`).
- AI chain: `sanitizeInput → buildPrompt → callOpenAI → parseJSON → normalize`.
- Supabase: chamadas diretas, sem camada de abstração.
- Constituição detalhada: `.specify/memory/constitution.md`.

### Hierarquia de fonte de verdade

```text
código atual > migrations > testes > Git log > memória do projeto
```

A memória explica decisões e aponta evidências. Não substitui leitura do código.

## CTX-memory-protocol

### Como esta memória deve ser usada

- Toda memória aponta para `Evidence` (arquivo/migration/teste).
- Antes de aceitar um valor da memória, abrir a evidência e conferir.
- Se a memória e o código divergirem, o código vence e a memória deve ser marcada `superseded` ou `obsolete`.

### Limites

- Memória atual é de **um único projeto**: IA RH.
- Memória global compartilhada entre projetos, MCP, embeddings e busca semântica ficam para outra onda.
- Não escrever credenciais, PII, conversa integral ou conteúdo confidencial em Markdown.

## CTX-git-flow

### Branches ativas (verificar antes de commitar)

```bash
git status          # Working tree limpo?
git rev-parse --abbrev-ref HEAD        # branch atual
git rev-parse --verify HEAD            # SHA atual
git status -sb    # upstream tracking
```

### Antes de commit solicitado

1. Gates do projeto: `npx tsc --noEmit`, `npm run lint`, `npm test`.
2. Confirmação explícita do usuário.
3. Commit código + memória juntos (memo check).
4. Push da branch.
