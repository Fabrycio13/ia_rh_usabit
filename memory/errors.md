# Erros do IA RH

> Apenas erros reutilizáveis com causa raiz verificada. Antes de aplicar, abrir o arquivo/teste/commit indicado na `Evidence`.

---

## ERR-2026-07-30-001 — Confirmar conteúdo de arquivo sensível com `xxd`/`od` antes de afirmar bug

- **Status:** monitoring
- **Domains:** security, tooling, debugging
- **Keywords:** byte-a-byte, terminal artifact, xxd, od, false positive
- **Symptom:** Ao ler trechos de templates literais ou valores interpolados via `read_file`, pode aparecer string visualmente mascarada (ex.: `***` onde deveria haver valor real). Leva à conclusão incorreta de bug ou de quebra de template.
- **Root cause:** A interface de apresentação do terminal pode interpretar template literals como formatação markdown ou aplicar anonimização visual ao exibir conteúdo. A leitura por `cat` ou por `read_file` pode renderizar valor diferente do real no disco.
- **Fix:** Para qualquer conclusão sobre conteúdo de arquivo sensível (credenciais, headers, segredos), confirmar com `xxd` ou `od -c` antes de afirmar existência de bug ou leak. Regra operacional: **nunca chutar, sempre verificar**.
- **Evidence:**
  - Ferramenta `xxd` e/ou `od -c` no terminal
  - Política operacional registrada na memória do Hermes em `~/AppData/Local/hermes/memory.json`
- **Prevent recurrence:** Toda conclusão sobre conteúdo de arquivo em CI/security review deve ser precedida por leitura byte-a-byte.
- **Verified:** 2026-07-30

---

## ERR-2026-07-30-002 — `ResizeObserver` em `vi.fn()` quebra construtor no Vitest 4

- **Status:** resolved
- **Domains:** testing, dashboard
- **Keywords:** ResizeObserver, Vitest, Recharts, jsdom, mock, vi.fn
- **Symptom:** Ao renderizar `Dashboard` (Recharts) sob jsdom, `new ResizeObserver(...)` falhava com `TypeError: ... is not a constructor`, quebrando os 3 testes do `Dashboard.test.tsx`.
- **Root cause:** `globalThis.ResizeObserver = vi.fn(...)` cria uma *função plana* que em Vitest 4 não satisfaz o requisito de ser construtível. Recharts e algumas libs invocam `new ResizeObserver(...)`, não apenas `ResizeObserver(...)`.
- **Fix:** Substituir por uma **classe construtiva** mockada:

```typescript
if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
}
```

- **Evidence:**
  - `tests/components/Dashboard.test.tsx` linhas 4-10
  - Commit `44f4c26 feat(security): H-05 DTOs públicos — allowlist filter + idempotência` (parte "Fix")
- **Prevent recurrence:** Ao mockar APIs nativas invocadas com `new`, usar `class { ... }`, não `vi.fn()`. Para casos de função pura (não construtível), usar `vi.fn()` apenas.
- **Verified:** 2026-07-30

---

## ERR-2026-07-30-003 — `setState` síncrono dentro de `useEffect` (19 ocorrências preexistentes)

- **Status:** pending
- **Domains:** frontend, pipeline, vagas
- **Keywords:** set-state-in-effect, useEffect, lint, react-hooks, cascading render, React 19
- **Symptom:** `npm run lint` reporta **19 erros + 1 warning** da regra `react-hooks/set-state-in-effect`. Padrão observado: `useEffect(() => { setState(...); }, [deps])` com `setState` chamando diretamente no corpo do efeito.
- **Root cause:** Em React 19, `setState` síncrono dentro de `useEffect` força renders em cascata. É uma regra da nova DX, não bug funcional imediato. Padrões comuns no projeto: sincronizar `value` externo em estado (`value → query`), resetar paginação quando filtros mudam, espelhar seleção de país em `formData.phone`.
- **Fix (não aplicado — pendente em PR dedicado):**
  - Quando o estado espelha `value` externo: derivar em render em vez de `useEffect`. `const query = value || ''`.
  - Resetar paginação quando filtros mudam: derivar paginação de `useMemo([items, filters])` ou trocar `useState` por cálculo em render.
  - Espelhar seleção em form data: chamar `setFormData` direto em `onChange`, não em efeito.
- **Localização dos 19 erros:**

```text
src/pages/candidates/Pipeline.tsx                (vários)
src/pages/vagas/SpontaneousApplication.tsx       (linhas 402, 466)
src/pages/vagas/Vagas.tsx                        (linha 767 — reset currentPage)
src/pages/vagas/components/CityAutocomplete.tsx  (linha 25)
```

- **Evidence:** `npm run lint` no commit `4acc073` (base anterior) já reportava os mesmos 20 problemas; confirmado via `git stash` antes do commit `89de437`.
- **Por que não foi resolvido agora:** Commit `89de437` é só sobre `memory/`. Misturar refactor de `Pipeline.tsx`/`Vagas.tsx` no mesmo PR dificulta review e reverte. `lint` não roda no CI (`AGENTS.md` linha 15), não trava merge.
- **Prevent recurrence:** Ao sincronizar estado com prop externa, preferir derivação em render ou `onChange`. Reservar `useEffect` para sincronização com sistemas externos (DOM imperativo, subscriptions, listeners).
- **Verified:** 2026-07-30
