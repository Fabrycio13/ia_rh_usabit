# Project Memory

Sistema portátil de memória do projeto IA RH — Usabit people. Versionado no Git junto com o código, lido pelo Hermes Desktop, OpenCode, Codex e Claude Code.

> **Princípio central:** a memória é um *índice explicativo*, não substitui código, migrations, testes ou Git. Toda afirmação deve ser confirmada no estado atual do repositório.

---

## Estrutura

```text
memory/
├── README.md       ← este arquivo (contrato)
├── context.md      ← contexto permanente do projeto
├── decisions.md    ← decisões confirmadas com IDs estáveis
├── errors.md       ← erros difíceis com causa raiz verificada
└── tasks.md        ← handoff temporário de trabalho incompleto
```

| Arquivo | Quando ler | Quando NÃO atualizar |
|---------|-----------|---------------------|
| `context.md` | No início de toda tarefa não trivial | Em mudanças triviais |
| `decisions.md` | Antes de alterar comportamento; procurar por domínio/keywords | Em commits triviais |
| `errors.md` | Ao deparar com sintoma conhecido (buscar) | Em bugs triviais |
| `tasks.md` | Ao continuar trabalho, fazer checkpoint ou trocar de computador | Em commits triviais |

---

## Protocolo do agente

### Antes de tarefa não trivial

1. Ler `memory/context.md`.
2. Identificar domínios e termos da tarefa.
3. Buscar termos em `memory/decisions.md` e `memory/errors.md`.
4. Ler somente as entradas encontradas (não carregar tudo).
5. Se for continuação, ler `memory/tasks.md`.
6. **Verificar** cada memória contra código/migrations/testes atuais antes de confiar.
7. Informar no final: `Memórias consultadas: ID1, ID2, ...`.

### Antes de commit solicitado ao usuário

1. Classificar: trabalho concluído **ou** checkpoint?
2. Registrar apenas decisões duráveis e erros verificados.
3. Manter ou limpar `HANDOFF-active` em `tasks.md`.
4. Rodar gates e teste de memória.
5. Nunca armazenar segredos, PII, conversas ou suposições.

---

## Formatos canônicos

### Contexto (`context.md`)

Blocos nomeados por anchor (`CTX-nome-curto`). Sem histórico cronológico. Máximo de ~150 linhas.

### Decisão (`decisions.md`)

```markdown
## DEC-YYYY-MM-DD-NNN — Título

- **Status:** accepted | superseded | rejected
- **Domains:** dashboard, ia, auth
- **Keywords:** scoring, permissions, KPI
- **Decision:** conclusão objetiva
- **Rationale:** por que essa opção
- **Evidence:** `path/to/file`, `path/to/test`
- **Supersedes:** ID anterior ou `none`
- **Verified:** YYYY-MM-DD
```

### Erro (`errors.md`)

```markdown
## ERR-YYYY-MM-DD-NNN — Título

- **Status:** resolved | monitoring | obsolete
- **Domains:** testing, dashboard
- **Keywords:** ResizeObserver, Vitest, Recharts
- **Symptom:** comportamento observado
- **Root cause:** causa confirmada
- **Fix:** solução semanticamente correta
- **Evidence:** teste/arquivo/comando verificável
- **Prevent recurrence:** regra reutilizável
- **Verified:** YYYY-MM-DD
```

### Handoff (`tasks.md`)

Primeira versão: no máximo **um** handoff ativo.

```markdown
## HANDOFF-active

- **Status:** active
- **Branch:** `feat/security-hardening`
- **Updated:** YYYY-MM-DD
- **Review after:** YYYY-MM-DD
- **Base HEAD:** `<commit anterior ao checkpoint>`
- **Goal:** ...
- **Done:** ...
- **Pending:** ...
- **Relevant files:** ...
- **Verification:** ...
- **Blockers:** ...
```

Quando não há trabalho pendente:

```markdown
# Trabalho em andamento

Nenhum handoff ativo.
```

---

## Política de gravação

### Gravar

- Decisão explícita que altera arquitetura, segurança ou comportamento futuro.
- Regra de negócio confirmada.
- Restrição permanente do projeto.
- Padrão reutilizável validado.
- Erro difícil com causa raiz verificada e risco de recorrência.
- Handoff de trabalho realmente incompleto.

### Nunca gravar

- Tokens, senhas, chaves, JWTs, cookies ou conteúdo de `.env`.
- Dados pessoais de candidatos, clientes ou usuários.
- Conversas integrais ou outputs brutos.
- Hipóteses não confirmadas.
- Trabalho concluído.
- Código já versionado.
- SHA/PR/Issue como memória isolada.
- Detalhes triviais (cor, padding, typo, rename).

---

## Sincronização entre computadores

A memória **não atravessa computadores sozinha**. Ela só fica disponível depois de:

1. Commit de código + memória juntos.
2. `git push` da branch.
3. `git fetch/pull` no outro computador na mesma branch.

Sem isso, nenhuma ferramenta no outro PC conseguirá ver o trabalho atual.

### Checkpoint no PC de origem

```text
1. git status e git rev-parse --abbrev-ref HEAD
2. Trabalho concluído ou checkpoint?
   ├── Concluído → registrar decisões/erros elegíveis; limpar handoff
   └── Pendente → registrar decisões/erros; criar/atualizar handoff
3. npx vitest run tests/memory/project-memory.test.ts
4. Mostrar diff completo
5. npx tsc --noEmit && npm run lint && npm test
6. Perguntar/confirmar autorização de commit
7. Commit código + memória juntos
8. Push da branch
```

### Retomada no outro PC

```text
1. git status antes de qualquer pull
   ├── Working tree sujo → resolver antes
   └── Working tree limpo → prosseguir
2. git fetch
3. git checkout da branch correta
4. git pull
5. Iniciar agente na raiz do repositório
6. Ler context.md
7. Se houver HANDOFF-active, validar Base HEAD como ancestral do HEAD atual
8. Buscar decisões/erros pelos domínios/keywords da nova tarefa
9. Confirmar evidências contra código atual
10. Informar memórias consultadas
```

---

## Staleness e revisão

- Toda entrada possui `Verified` (data da última confirmação).
- Decisão antiga quando substituída: marcar `superseded` em vez de reescrever.
- Erro tratado: marcar `resolved`. Padrão abandonado: `obsolete`.
- Handoff: campo `Review after` alerta para revisão. Não é auto-arquivamento.

---

## Crescimento futuro

Quando `decisions.md` ou `errors.md` ultrapassar ~200 linhas OU buscas retornarem ruído demais, dividir por domínio:

```text
memory/
├── decisions/
│   ├── index.md
│   ├── auth.md
│   ├── dashboard.md
│   └── security.md
└── errors/
    ├── index.md
    ├── frontend.md
    └── tooling.md
```

Não criar essa estrutura preventivamente.

---

## Fora do escopo desta onda

- Memória global compartilhada entre projetos.
- MCP server, Supabase/pgvector como backend de memória.
- Embeddings, busca semântica, painel administrativo.
- Hook Git com IA gerando resumo automaticamente.
- Memória para preferências pessoais do usuário.
- Integração específica por ferramenta além do `AGENTS.md` canônico.
