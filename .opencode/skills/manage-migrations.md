# Manage Migrations — IA RH

> Skill auxiliar do `@backend` para criar e gerenciar migrations SQL.
> Localizada em `D:\Projetos\IA RH\.opencode\skills\manage-migrations.md`

---

## Regras Obrigatórias (Constitution IV)

| Regra | Descrição |
|---|---|
| Idempotente | `DO $$` com `IF NOT EXISTS` / `IF EXISTS` |
| `IS NOT DISTINCT FROM` | Sempre para `org_id` em RLS |
| 5 roles | `owner`, `administrador`, `supervisor`, `rh`, `convidado` |
| `SECURITY DEFINER` | Helper functions com `SET search_path = ''` |
| DROP seguro | Sempre `IF EXISTS` |
| Audit trail | `activity_logs` imutável |

## Template

```sql
-- Migration <NNN>: <descrição>
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '<tabela>' AND column_name = '<coluna>'
  ) THEN
    ALTER TABLE public.<tabela> ADD COLUMN <coluna> <tipo>;
  END IF;
END $$;
ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<nome>" ON public.<tabela>
  FOR SELECT TO authenticated
  USING (organization_id IS NOT DISTINCT FROM get_my_org_id());
CREATE INDEX IF NOT EXISTS idx_<tabela>_<coluna> ON public.<tabela>(<coluna>);
```

## Como criar

1. **Consultar** `docs/architecture/migration-history.md` (último número)
2. **Criar** `supabase/migrations/<NNN>_<feature>_<acao>.sql`
3. **Atualizar** `docs/architecture/migration-history.md`
4. **Aplicar:** `npx supabase migration up` (local) / `npx supabase db push --linked` (prod)

## Histórico

Última migration: `081_fix_increment_trigger_updates.sql`. Total: 81 migrations.
Duplicatas nos números 25, 26, 27, 28 (2 arquivos cada — não mexer, já aplicadas).

## Comandos

```bash
# Ver última migration
ls -1 supabase/migrations/*.sql | tail -1

# Ver duplicatas
ls supabase/migrations/*.sql | sed 's/.*\///' | cut -d_ -f1 | sort | uniq -d

# Aplicar local
npx supabase migration up

# Aplicar em produção
npx supabase db push --linked
```

## Referências

- Migration history: `docs/architecture/migration-history.md`
- Constitution: `.specify/memory/constitution.md`
- Padrões SQL: `.opencode/agents/backend.md`
