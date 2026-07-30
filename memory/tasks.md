# Trabalho em andamento

Nenhum handoff ativo.

---

## Como criar um handoff

Quando o trabalho estiver incompleto e você for parar ou trocar de computador, peça ao agente para criar/atualizar `HANDOFF-active`:

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

Quando a tarefa for concluída, retorne este arquivo para:

```markdown
# Trabalho em andamento

Nenhum handoff ativo.
```

Não manter histórico de handoffs concluídos; o Git preserva o histórico. Apenas um `HANDOFF-active` por vez nesta primeira versão.
