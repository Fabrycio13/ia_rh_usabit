# Pre-Move Safety Check

> **Skill obrigatória antes de mover/renomear arquivos.**
> Lição aprendida em 2026-07-14: 48 imports quebraram ao mover 29 testes para subpastas.
> O erro só aparecia rodando os testes, não analisando código estaticamente.

---

## ⚠️ Regra: SEMPRE rodar testes antes e depois de mover arquivos

**NUNCA pule `npm test`.** O erro de imports relativos só aparece na execução.

### 1. ANTES de mover

```bash
# Rodar testes como baseline
npm test
# Anotar resultado (ex: "28 files, 130 tests, 0 failures")
```

### 2. APÓS mover (antes de commit)

Verificar imports relativos quebrados:

```bash
# Depth 0 (tests/foo.tsx) → vi.mock('../src/...') está correto
# Depth 1 (tests/subdir/foo.tsx) → vi.mock('../../src/...') necessário

# Detectar imports quebrados
grep -rn "from '\.\./src/\|import('\.\./src/" tests/ | grep -v node_modules
```

**Pattern de correção:**

| Profundidade | Antes | Depois |
|---|---|---|
| `tests/foo.tsx` | `'../src/...'` | ✅ Já correto |
| `tests/auth/foo.tsx` | `'../src/...'` | ❌ Deveria ser `'../../src/...'` |
| `tests/auth/foo.tsx` | `import('../src/...')` | ❌ Deveria ser `import('../../src/...')` |

### 3. Rodar testes DEPOIS

```bash
npm test
```

Se o número de testes passou a falhar, **NÃO comite**. Diagnostique antes.

### 4. Commitar só quando bater o baseline

```bash
# Comparar: "28 files, 130 tests, 0 failures" = baseline → ✅ commit
# Se diferente → 🔴 diagnosticar
```

---

## Comandos de verificação rápida

```bash
# Checar todos os imports de arquivos em subpastas
find tests -mindepth 2 -name "*.tsx" -o -name "*.ts" | xargs grep -l "\.\./src/" 2>/dev/null

# Corrigir automático para subpastas (depth 1)
sed -i "s|from '\.\./src/|from '../../src/|g" tests/*/*.tsx tests/*/*.ts
sed -i "s|import('\.\./src/|import('../../src/|g" tests/*/*.tsx tests/*/*.ts
```

---

## Por que isso é crítico

- `vi.mock` com path relativo errado faz o Vitest carregar o módulo **real** em vez do mock
- O módulo real tenta conectar no Supabase sem `.env` → `supabaseUrl is required` → erro silencioso
- O componente não renderiza → `findByText` fails → **13 test files quebram de uma vez**
- Tudo porque um `../src/` deveria ser `../../src/`
