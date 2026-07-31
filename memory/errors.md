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
- **Progresso (2026-07-31):** Das 19 ocorrências originais, 4 foram resolvidas em ERR-2026-07-30-004 (`CityAutocomplete.tsx:1`, `Vagas.tsx:1`, `SpontaneousApplication.tsx:2`). Restam 15 ocorrências em outros 13 arquivos — destaque para `Pipeline.tsx` (várias) e `JobApplication.tsx` (2), mantidos em PRs dedicados por estarem acoplados a lógica maior.
- **Verified:** 2026-07-30 (original) / 2026-07-31 (parcial via ERR-004)

---

## ERR-2026-07-30-004 — ERR-003 reduzido em 4 ocorrências (3 arquivos: CityAutocomplete, Vagas, SpontaneousApplication)
- **Status:** resolved
- **Domains:** frontend, vagas
- **Keywords:** set-state-in-effect, react-hooks/exhaustive-deps, Vagas, SpontaneousApplication, CityAutocomplete
- **Context:** Continuação do ERR-2026-07-30-003. Foram atacadas as 4 ocorrências dos 3 arquivos fora do `Pipeline.tsx` (que continua em PR dedicado por ter múltiplas ocorrências acopladas).
- **Fixes aplicados:**

  - **`src/pages/vagas/components/CityAutocomplete.tsx`**: `useEffect(() => setQuery(value), [value])` removido. Componente virou totalmente controlado (`input value={value}`, `onChange` chama `onChange(text)` direto, `select` chama `onChange(formatted)`). Sem `query` interno.
  - **`src/pages/vagas/Vagas.tsx`** (linha 767): `useEffect(() => setCurrentPage(1), [searchTerm, selectedOrgId, selectedStatusFilter, selectedRoleFilter, startDate, endDate])` removido. Reset de paginação agora é inline nos 9 sites que alteram filtro: `setSearchTerm(...)`, `setSelectedOrgId(...)` (2 — "Todas" + item), `setSelectedRoleFilter(...)` (2 — "Todos" + item), `setSelectedStatusFilter(...)` (2 — "Todos" + item), `setStartDate(...)`, `setEndDate(...)`, e o botão "Limpar filtros" (que também reseta `currentPage`).
  - **`src/pages/vagas/SpontaneousApplication.tsx`** (linhas 402 e 466):
    - Linha 402: `useEffect(() => { if (!formData.phone && selectedCountry.code) setFormData(...) }, [selectedCountry])` removido. `formData.phone` agora é inicializado com `countries[0].code + ' '` no próprio `useState`. Para isso, `countries` foi movido para antes do `useState` de `formData`.
    - Linha 466: `useEffect(() => { if (!loading) triggerStepReveal(200); }, [loading, triggerStepReveal])` removido. `triggerStepReveal(200)` agora é chamado no `finally` do `fetchOrgData` (junto com `setLoading(false)`). Para isso, `triggerStepReveal` foi movido para antes do `useEffect` de `fetchOrgData` (evita TDZ) e adicionado às dependências: `[orgId, triggerStepReveal]`.
- **Pitfall (encontrado e corrigido):** Ao reescrever `handlePhoneChange` para receber `e: React.ChangeEvent<HTMLInputElement>`, quebrei o teste `preenche formulario completo de 3 etapas e envia`. Causa: o JSX passa `e => handlePhoneChange(e.target.value)` (string), não evento. Corrigido voltando a assinatura para `(val: string)`. **Lição:** ao mexer em handler, conferir o call site (JSX e `onClick` dos países) — não apenas o teste.
- **Evidence:**
  - `src/pages/vagas/components/CityAutocomplete.tsx` (atual)
  - `src/pages/vagas/Vagas.tsx` linhas 765-768, 826, 856, 865, 904, 914, 947, 956, 972, 976, 985-989
  - `src/pages/vagas/SpontaneousApplication.tsx` linhas 327-367, 375-393, 426-449
  - `tests/vagas/SpontaneousApplication.test.tsx` (3/3 passando após fix)
- **Resultado:** `npm run lint` nos 3 arquivos: 0 erros, 0 warnings. `npm test`: 155/155 (incluindo 3 do `SpontaneousApplication`). `npm run build`: OK.
- **Remaining:** `Pipeline.tsx` ainda com 1 erro (`setCards([]); setColumns([]); if (selectedPipelineId && profile.userId) { loadPipelineDataRef.current = loadPipelineData; ... }` — linhas 457-460). Mantido em PR dedicado conforme ERR-003.
- **Verified:** 2026-07-31
