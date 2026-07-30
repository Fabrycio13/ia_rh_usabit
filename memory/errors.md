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
